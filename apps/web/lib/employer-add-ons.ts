import { and, asc, eq, gt, isNull, or, sql } from "drizzle-orm"
import type Stripe from "stripe"

import { getCompanyById, getCompanyByOwnerAuthId } from "@/lib/companies"
import { db } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { getStripe } from "@/lib/stripe"
import { companies } from "@repo/db/schema/companies"
import { jobs } from "@repo/db/schema/jobs"
import { employerAddOnPurchases, employerAddOnStatusEnum } from "@repo/db/schema/employer-add-ons"

export const employerAddOnIds = ["extra_slot", "weekly_feature", "social_shoutout"] as const

export type EmployerAddOnId = (typeof employerAddOnIds)[number]
export type EmployerAddOnStatus = (typeof employerAddOnStatusEnum.enumValues)[number]

type EmployerAddOnDefinition = {
  id: EmployerAddOnId
  label: string
  description: string
  priceLabel: string
  stripePriceEnvVar: string
  requiresJob: boolean
  dashboardHref: string
}

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000
const SOCIAL_SHOUTOUT_QUEUE_RECORDED_NOTE = "social_queue_recorded"

export const EMPLOYER_ADD_ON_DEFINITIONS: Record<EmployerAddOnId, EmployerAddOnDefinition> = {
  extra_slot: {
    id: "extra_slot",
    label: "Extra Slot",
    description: "Add one extra live listing on top of the Community plan limit.",
    priceLabel: "$29",
    stripePriceEnvVar: "STRIPE_EXTRA_SLOT_PRICE_ID",
    requiresJob: false,
    dashboardHref: "/dashboard/plan#add-ons"
  },
  weekly_feature: {
    id: "weekly_feature",
    label: "Weekly Feature",
    description: "Feature a job at the top of HireSalem surfaces for 7 days.",
    priceLabel: "$45",
    stripePriceEnvVar: "STRIPE_WEEKLY_FEATURE_PRICE_ID",
    requiresJob: true,
    dashboardHref: "/dashboard/jobs"
  },
  social_shoutout: {
    id: "social_shoutout",
    label: "Social Shoutout",
    description: "Queue your job for a HireSalem Instagram and Facebook shoutout.",
    priceLabel: "$25",
    stripePriceEnvVar: "STRIPE_SOCIAL_SHOUTOUT_PRICE_ID",
    requiresJob: true,
    dashboardHref: "/dashboard/jobs"
  }
}

export type EmployerAddOnPricing = EmployerAddOnDefinition & {
  priceId: string | null
  priceLabelResolved: string | null
  isConfigured: boolean
}

export function isEmployerAddOnId(value: unknown): value is EmployerAddOnId {
  return typeof value === "string" && employerAddOnIds.includes(value as EmployerAddOnId)
}

export function getEmployerAddOnDefinition(addOnId: EmployerAddOnId) {
  return EMPLOYER_ADD_ON_DEFINITIONS[addOnId]
}

export function getStripePriceIdForEmployerAddOn(addOnId: EmployerAddOnId) {
  const envVar = getEmployerAddOnDefinition(addOnId).stripePriceEnvVar
  return process.env[envVar]?.trim() || null
}

export function getEmployerAddOnIdForStripePriceId(priceId: string | null | undefined) {
  if (!priceId) {
    return null
  }

  return employerAddOnIds.find((id) => getStripePriceIdForEmployerAddOn(id) === priceId) ?? null
}

function formatStripeOneTimePrice(price: Stripe.Price) {
  if (typeof price.unit_amount !== "number") {
    return null
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: price.currency.toUpperCase()
  }).format(price.unit_amount / 100)
}

export async function listEmployerAddOnPricing(): Promise<EmployerAddOnPricing[]> {
  let stripe: Stripe | null = null

  try {
    stripe = getStripe()
  } catch {
    stripe = null
  }

  return Promise.all(
    employerAddOnIds.map(async (id) => {
      const definition = getEmployerAddOnDefinition(id)
      const priceId = getStripePriceIdForEmployerAddOn(id)

      if (!stripe || !priceId) {
        return {
          ...definition,
          priceId,
          priceLabelResolved: null,
          isConfigured: Boolean(priceId)
        }
      }

      try {
        const price = await stripe.prices.retrieve(priceId)

        return {
          ...definition,
          priceId,
          priceLabelResolved: formatStripeOneTimePrice(price),
          isConfigured: true
        }
      } catch {
        return {
          ...definition,
          priceId,
          priceLabelResolved: null,
          isConfigured: true
        }
      }
    })
  )
}

export async function getCompanyForEmployerAddOnCheckout(ownerAuthId: string) {
  return getCompanyByOwnerAuthId(ownerAuthId)
}

export async function getJobForEmployerAddOnCheckout(jobId: string, ownerAuthId: string, isAdmin: boolean) {
  const [job] = await db
    .select({
      id: jobs.id,
      slug: jobs.slug,
      title: jobs.title,
      ownerAuthId: jobs.ownerAuthId,
      companyId: jobs.companyId,
      isActive: jobs.isActive,
      isFeatured: jobs.isFeatured,
      paymentStatus: jobs.paymentStatus,
      featuredExpiresAt: jobs.featuredExpiresAt,
      expiresAt: jobs.expiresAt
    })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1)

  if (!job) {
    return null
  }

  if (!isAdmin && job.ownerAuthId !== ownerAuthId) {
    return null
  }

  return job
}

export async function hasQueuedSocialShoutoutPurchase(jobId: string) {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(employerAddOnPurchases)
    .where(
      and(
        eq(employerAddOnPurchases.jobId, jobId),
        eq(employerAddOnPurchases.type, "social_shoutout"),
        or(
          eq(employerAddOnPurchases.status, "pending"),
          and(eq(employerAddOnPurchases.status, "paid"), isNull(employerAddOnPurchases.fulfilledAt))
        )
      )
    )

  return (row?.count ?? 0) > 0
}

export async function hasPendingOrActiveWeeklyFeaturePurchase(jobId: string, now = new Date()) {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(employerAddOnPurchases)
    .where(
      and(
        eq(employerAddOnPurchases.jobId, jobId),
        eq(employerAddOnPurchases.type, "weekly_feature"),
        or(
          eq(employerAddOnPurchases.status, "pending"),
          and(eq(employerAddOnPurchases.status, "paid"), gt(employerAddOnPurchases.expiresAt, now))
        )
      )
    )

  return (row?.count ?? 0) > 0
}

export async function createPendingEmployerAddOnPurchase(input: {
  companyId: string
  ownerAuthId: string
  type: EmployerAddOnId
  jobId?: string | null
  stripeCheckoutSessionId: string
}) {
  const [created] = await db
    .insert(employerAddOnPurchases)
    .values({
      companyId: input.companyId,
      ownerAuthId: input.ownerAuthId,
      type: input.type,
      jobId: input.jobId ?? null,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      status: "pending"
    })
    .returning()

  return created ?? null
}

export async function markEmployerAddOnCanceledBySessionId(stripeCheckoutSessionId: string) {
  const [updated] = await db
    .update(employerAddOnPurchases)
    .set({
      status: "canceled"
    })
    .where(and(eq(employerAddOnPurchases.stripeCheckoutSessionId, stripeCheckoutSessionId), eq(employerAddOnPurchases.status, "pending")))
    .returning()

  return updated ?? null
}

export async function getAvailableExtraSlotCredits(companyId: string) {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(employerAddOnPurchases)
    .where(
      and(
        eq(employerAddOnPurchases.companyId, companyId),
        eq(employerAddOnPurchases.type, "extra_slot"),
        eq(employerAddOnPurchases.status, "paid"),
        isNull(employerAddOnPurchases.consumedAt)
      )
    )

  return row?.count ?? 0
}

export async function consumeExtraSlotCredit(input: { companyId: string; jobId: string; now?: Date }) {
  const now = input.now ?? new Date()
  const [credit] = await db
    .select({
      id: employerAddOnPurchases.id
    })
    .from(employerAddOnPurchases)
    .where(
      and(
        eq(employerAddOnPurchases.companyId, input.companyId),
        eq(employerAddOnPurchases.type, "extra_slot"),
        eq(employerAddOnPurchases.status, "paid"),
        isNull(employerAddOnPurchases.consumedAt)
      )
    )
    .orderBy(asc(employerAddOnPurchases.createdAt))
    .limit(1)

  if (!credit) {
    return null
  }

  const [updated] = await db
    .update(employerAddOnPurchases)
    .set({
      jobId: input.jobId,
      consumedAt: now,
      fulfilledAt: now
    })
    .where(eq(employerAddOnPurchases.id, credit.id))
    .returning()

  return updated ?? null
}

async function recordSocialShoutoutQueueNotification(purchaseId: string) {
  const [updated] = await db
    .update(employerAddOnPurchases)
    .set({
      note: SOCIAL_SHOUTOUT_QUEUE_RECORDED_NOTE
    })
    .where(eq(employerAddOnPurchases.id, purchaseId))
    .returning({
      id: employerAddOnPurchases.id
    })

  return updated ?? null
}

async function notifySocialShoutoutQueue(input: {
  companyName: string
  jobTitle: string
  dashboardPath: string
}) {
  const recipient = process.env.EMPLOYER_NOTIFICATIONS_EMAIL?.trim()

  if (!recipient) {
    return
  }

  await sendEmail({
    to: recipient,
    subject: `Social shoutout queued: ${input.companyName} - ${input.jobTitle}`,
    text: `A social shoutout purchase was queued for ${input.companyName} / ${input.jobTitle}. Review it in ${input.dashboardPath}.`,
    html: `<p>A social shoutout purchase was queued for <strong>${input.companyName}</strong> / <strong>${input.jobTitle}</strong>.</p><p>Review it in ${input.dashboardPath}.</p>`
  }).catch(() => null)
}

export async function syncEmployerAddOnFromCheckoutSession(session: Stripe.Checkout.Session) {
  const addOnType = isEmployerAddOnId(session.metadata?.addOnType) ? session.metadata?.addOnType : null

  if (!addOnType) {
    return null
  }

  const [purchase] = await db
    .select()
    .from(employerAddOnPurchases)
    .where(eq(employerAddOnPurchases.stripeCheckoutSessionId, session.id))
    .limit(1)

  if (!purchase) {
    return null
  }

  const now = new Date()
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null
  const expiresAt = purchase.expiresAt ?? (addOnType === "weekly_feature" ? new Date(now.getTime() + WEEK_IN_MS) : null)
  const effectivePurchase =
    purchase.status === "paid"
      ? purchase
      : (
          await db
            .update(employerAddOnPurchases)
            .set({
              status: "paid",
              stripePaymentIntentId: paymentIntentId,
              paidAt: now,
              expiresAt,
              fulfilledAt: addOnType === "social_shoutout" ? null : now
            })
            .where(eq(employerAddOnPurchases.id, purchase.id))
            .returning()
        )[0] ?? purchase

  if (addOnType === "weekly_feature" && effectivePurchase.jobId && expiresAt) {
    const [job] = await db
      .select({
        isFeatured: jobs.isFeatured,
        featuredAt: jobs.featuredAt,
        featuredExpiresAt: jobs.featuredExpiresAt
      })
      .from(jobs)
      .where(eq(jobs.id, effectivePurchase.jobId))
      .limit(1)

    const shouldApplyFeature =
      !job ||
      !job.isFeatured ||
      !job.featuredExpiresAt ||
      job.featuredExpiresAt.getTime() !== expiresAt.getTime()

    if (shouldApplyFeature) {
      await db
        .update(jobs)
        .set({
          isFeatured: job?.isFeatured ?? false,
          featuredAt: job?.featuredAt ?? effectivePurchase.paidAt ?? now,
          featuredExpiresAt: expiresAt
        })
        .where(eq(jobs.id, effectivePurchase.jobId))
    }
  }

  if (
    addOnType === "social_shoutout" &&
    effectivePurchase.jobId &&
    effectivePurchase.note !== SOCIAL_SHOUTOUT_QUEUE_RECORDED_NOTE &&
    !effectivePurchase.fulfilledAt
  ) {
    const [job] = await db
      .select({
        title: jobs.title
      })
      .from(jobs)
      .where(eq(jobs.id, effectivePurchase.jobId))
      .limit(1)
    const company = await getCompanyById(effectivePurchase.companyId)

    if (job && company) {
      await notifySocialShoutoutQueue({
        companyName: company.name,
        jobTitle: job.title,
        dashboardPath: "/admin/jobs"
      })
    }

    await recordSocialShoutoutQueueNotification(effectivePurchase.id)
  }

  return effectivePurchase
}

export async function syncEmployerAddOnFromCheckoutSessionId(sessionId: string, stripeClient?: Stripe) {
  const stripe = stripeClient ?? getStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  return syncEmployerAddOnFromCheckoutSession(session)
}

export async function listCompanyEmployerAddOnPurchases(companyId: string) {
  return db
    .select({
      id: employerAddOnPurchases.id,
      type: employerAddOnPurchases.type,
      status: employerAddOnPurchases.status,
      jobId: employerAddOnPurchases.jobId,
      paidAt: employerAddOnPurchases.paidAt,
      fulfilledAt: employerAddOnPurchases.fulfilledAt,
      consumedAt: employerAddOnPurchases.consumedAt,
      expiresAt: employerAddOnPurchases.expiresAt,
      createdAt: employerAddOnPurchases.createdAt
    })
    .from(employerAddOnPurchases)
    .where(eq(employerAddOnPurchases.companyId, companyId))
    .orderBy(sql`${employerAddOnPurchases.paidAt} desc nulls last`, sql`${employerAddOnPurchases.createdAt} desc`)
}

export async function listPendingSocialShoutouts() {
  return db
    .select({
      id: employerAddOnPurchases.id,
      companyId: employerAddOnPurchases.companyId,
      jobId: employerAddOnPurchases.jobId,
      createdAt: employerAddOnPurchases.createdAt,
      paidAt: employerAddOnPurchases.paidAt,
      companyName: companies.name,
      jobTitle: jobs.title,
      jobSlug: jobs.slug
    })
    .from(employerAddOnPurchases)
    .innerJoin(jobs, eq(employerAddOnPurchases.jobId, jobs.id))
    .innerJoin(companies, eq(employerAddOnPurchases.companyId, companies.id))
    .where(
      and(
        eq(employerAddOnPurchases.type, "social_shoutout"),
        eq(employerAddOnPurchases.status, "paid"),
        isNull(employerAddOnPurchases.fulfilledAt)
      )
    )
    .orderBy(asc(employerAddOnPurchases.createdAt))
}

export async function markSocialShoutoutFulfilled(id: string) {
  const [updated] = await db
    .update(employerAddOnPurchases)
    .set({
      fulfilledAt: new Date()
    })
    .where(
      and(
        eq(employerAddOnPurchases.id, id),
        eq(employerAddOnPurchases.type, "social_shoutout"),
        eq(employerAddOnPurchases.status, "paid"),
        isNull(employerAddOnPurchases.fulfilledAt)
      )
    )
    .returning()

  return updated ?? null
}

export function getActiveFeaturedAddOnCondition(now = new Date()) {
  return gt(jobs.featuredExpiresAt, now)
}

export function hasActiveFeaturedAddOn(job: Pick<typeof jobs.$inferSelect, "featuredExpiresAt">, now = new Date()) {
  return Boolean(job.featuredExpiresAt && job.featuredExpiresAt.getTime() > now.getTime())
}

export function getEmployerAddOnCheckoutErrorMessage(error?: string) {
  if (error === "invalid_add_on") {
    return "Select a valid add-on."
  }

  if (error === "job_required") {
    return "Choose a job for this add-on."
  }

  if (error === "job_not_found") {
    return "That job could not be found for this account."
  }

  if (error === "job_must_be_live") {
    return "This add-on can only be purchased for a live job."
  }

  if (error === "billing_unavailable") {
    return "Add-on billing is not configured yet."
  }

  if (error === "plan_not_eligible") {
    return "This add-on is not available on your current plan."
  }

  if (error === "featured_already_active") {
    return "That job already has an active Spotlight placement."
  }

  if (error === "social_shoutout_already_queued") {
    return "A social shoutout is already queued for that job."
  }

  return null
}
