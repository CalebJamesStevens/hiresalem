import { desc, eq } from "drizzle-orm"
import { z } from "zod"

import { hasRole, normalizeRoles } from "@/lib/authz"
import { calculateJobListingPrice, getPublishedJobsFilter, JOB_LISTING_DEFAULT_DAYS, JOB_LISTING_MAX_DAYS, JOB_LISTING_MIN_DAYS } from "@/lib/job-listing-billing"
import { getCompanyByOwnerAuthId } from "@/lib/companies"
import { getSessionSafe } from "@/lib/session"
import { requireApiRoles } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { getRequestKey } from "@/lib/request"
import { getStripe } from "@/lib/stripe"
import { employmentTypeEnum, jobCategoryEnum, jobs, salaryIntervalEnum, workModeEnum } from "@repo/db/schema/jobs"

const optionalUrlSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}, z.string().url().optional())

const optionalNumberSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim()) {
    return Number.parseInt(value.trim(), 10)
  }

  if (typeof value === "number") {
    return value
  }

  return undefined
}, z.number().int().positive().optional())

const listingDurationSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim()) {
    return Number.parseInt(value.trim(), 10)
  }

  if (typeof value === "number") {
    return value
  }

  return JOB_LISTING_DEFAULT_DAYS
}, z.number().int().min(JOB_LISTING_MIN_DAYS).max(JOB_LISTING_MAX_DAYS))

const createJobSchema = z
  .object({
    title: z.string().min(2),
    slug: z.string().optional(),
    location: z.string().optional(),
    salary: z.string().optional(),
    workMode: z.enum(workModeEnum.enumValues).optional(),
    employmentType: z.enum(employmentTypeEnum.enumValues).optional(),
    category: z.enum(jobCategoryEnum.enumValues).optional(),
    salaryMin: optionalNumberSchema,
    salaryMax: optionalNumberSchema,
    salaryCurrency: z.string().trim().min(3).max(3).optional(),
    salaryInterval: z.enum(salaryIntervalEnum.enumValues).optional(),
    description: z.string().optional(),
    applyType: z.enum(["onsite", "external"]).default("onsite"),
    applyUrl: optionalUrlSchema,
    listingDurationDays: listingDurationSchema,
    companyId: z.string().uuid().optional(),
    website: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (value.applyType === "external" && !value.applyUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["applyUrl"],
        message: "External apply URL is required for external jobs"
      })
    }

    if (value.salaryMin && value.salaryMax && value.salaryMin > value.salaryMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salaryMax"],
        message: "Maximum salary must be greater than minimum salary"
      })
    }
  })

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

function cleanOptionalText(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function cleanOptionalCurrency(value: string | undefined) {
  const trimmed = value?.trim().toUpperCase()
  return trimmed ? trimmed : null
}

export async function GET() {
  const session = await getSessionSafe()
  const roles = normalizeRoles(session?.user?.roles)
  const isAdmin = hasRole(roles, "admin")

  const data = isAdmin
    ? await db.select().from(jobs).orderBy(desc(jobs.createdAt))
    : await db.select().from(jobs).where(getPublishedJobsFilter()).orderBy(desc(jobs.createdAt))

  return Response.json(data)
}

export async function POST(req: Request) {
  const authResult = await requireApiRoles(["business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const isAdmin = hasRole(authResult.user.roles, "admin")

  const rate = checkRateLimit("jobs:create", getRequestKey(req, authResult.user.id), 5, 60 * 60 * 1000)
  if (!rate.ok) {
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  const parsed = createJobSchema.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 })
  }

  if (parsed.data.website?.trim()) {
    return Response.json({ error: "Spam detected" }, { status: 400 })
  }

  const title = parsed.data.title.trim()
  const listingDurationDays = parsed.data.listingDurationDays
  const baseSlug = toSlug(parsed.data.slug ?? title) || "job"
  const slug = parsed.data.slug ? baseSlug : `${baseSlug}-${Date.now().toString(36)}`
  const ownerCompany = isAdmin ? null : await getCompanyByOwnerAuthId(authResult.user.id)

  if (!isAdmin && !ownerCompany) {
    return Response.json({ error: "Complete business setup before posting a job." }, { status: 400 })
  }

  const now = new Date()

  if (isAdmin) {
    const [created] = await db
      .insert(jobs)
      .values({
        title,
        slug,
        ownerAuthId: authResult.user.id,
        companyId: ownerCompany?.id ?? parsed.data.companyId ?? null,
        location: cleanOptionalText(parsed.data.location),
        salary: cleanOptionalText(parsed.data.salary),
        workMode: parsed.data.workMode ?? null,
        employmentType: parsed.data.employmentType ?? null,
        category: parsed.data.category ?? null,
        salaryMin: parsed.data.salaryMin ?? null,
        salaryMax: parsed.data.salaryMax ?? null,
        salaryCurrency: cleanOptionalCurrency(parsed.data.salaryCurrency) ?? (parsed.data.salaryMin || parsed.data.salaryMax ? "USD" : null),
        salaryInterval: parsed.data.salaryInterval ?? null,
        description: cleanOptionalText(parsed.data.description),
        applyType: parsed.data.applyType,
        applyUrl: parsed.data.applyType === "external" ? cleanOptionalText(parsed.data.applyUrl) : null,
        isActive: true,
        listingDurationDays,
        paymentStatus: "paid",
        activatedAt: now,
        expiresAt: new Date(now.getTime() + listingDurationDays * 24 * 60 * 60 * 1000)
      })
      .returning()

    return Response.json(created, { status: 201 })
  }

  let stripe

  try {
    stripe = getStripe()
  } catch {
    return Response.json({ error: "Stripe billing is not configured yet." }, { status: 503 })
  }

  const [created] = await db
    .insert(jobs)
    .values({
      title,
      slug,
      ownerAuthId: authResult.user.id,
      companyId: ownerCompany?.id ?? parsed.data.companyId ?? null,
      location: cleanOptionalText(parsed.data.location),
      salary: cleanOptionalText(parsed.data.salary),
      workMode: parsed.data.workMode ?? null,
      employmentType: parsed.data.employmentType ?? null,
      category: parsed.data.category ?? null,
      salaryMin: parsed.data.salaryMin ?? null,
      salaryMax: parsed.data.salaryMax ?? null,
      salaryCurrency: cleanOptionalCurrency(parsed.data.salaryCurrency) ?? (parsed.data.salaryMin || parsed.data.salaryMax ? "USD" : null),
      salaryInterval: parsed.data.salaryInterval ?? null,
      description: cleanOptionalText(parsed.data.description),
      applyType: parsed.data.applyType,
      applyUrl: parsed.data.applyType === "external" ? cleanOptionalText(parsed.data.applyUrl) : null,
      isActive: false,
      listingDurationDays,
      paymentStatus: "pending"
    })
    .returning()

  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(req.url).origin
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: created.id,
      customer_email: authResult.user.email ?? undefined,
      success_url: `${origin}/post-job/success?jobId=${created.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/post-job?canceled=1&jobId=${created.id}`,
      metadata: {
        jobId: created.id,
        ownerAuthId: authResult.user.id
      },
      line_items: [
        {
          quantity: listingDurationDays,
          price_data: {
            currency: "usd",
            unit_amount: calculateJobListingPrice(1),
            product_data: {
              name: "HireSalem job listing",
              description: `${title} for ${ownerCompany?.name ?? "your company"}`
            }
          }
        }
      ]
    })

    if (!checkoutSession.url) {
      await db.delete(jobs).where(eq(jobs.id, created.id))
      return Response.json({ error: "Stripe checkout did not return a hosted URL." }, { status: 502 })
    }

    await db
      .update(jobs)
      .set({
        stripeCheckoutSessionId: checkoutSession.id
      })
      .where(eq(jobs.id, created.id))

    return Response.json(
      {
        jobId: created.id,
        checkoutUrl: checkoutSession.url
      },
      { status: 201 }
    )
  } catch {
    await db.delete(jobs).where(eq(jobs.id, created.id))
    return Response.json({ error: "Unable to start Stripe checkout." }, { status: 502 })
  }
}
