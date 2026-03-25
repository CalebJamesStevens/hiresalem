import { eq, or } from "drizzle-orm"
import type Stripe from "stripe"

import { getCompanyById, type Company } from "@/lib/companies"
import { db } from "@/lib/db"
import { getStripe } from "@/lib/stripe"
import { DEFAULT_COMPANY_PLAN_ID, getCompanyPlanLabel, type CompanyPlanId } from "@repo/db/plans"
import { companies, companyBillingStatusEnum } from "@repo/db/schema/companies"

export const billableCompanyPlanIds = ["standard", "partner"] as const

export type BillableCompanyPlanId = (typeof billableCompanyPlanIds)[number]
export type CompanyBillingStatus = (typeof companyBillingStatusEnum.enumValues)[number]

type CompanyBillingDefinition = {
  id: BillableCompanyPlanId
  description: string
  features: string[]
  stripePriceEnvVar: string
}

const COMPANY_BILLING_DEFINITIONS: Record<BillableCompanyPlanId, CompanyBillingDefinition> = {
  standard: {
    id: "standard",
    description: "Unlimited live jobs, one Featured Spotlight slot, and an enhanced Salem-first employer profile.",
    features: ["Unlimited active listings", "No expiry while subscribed", "Enhanced business profile", "1 featured Spotlight slot"],
    stripePriceEnvVar: "STRIPE_STANDARD_PLAN_PRICE_ID"
  },
  partner: {
    id: "partner",
    description: "Premium employer placement with every listing featured plus homepage Top Employer visibility.",
    features: ["Unlimited active listings", "Enhanced business profile", "All listings featured", 'Homepage "Top Employer" slot'],
    stripePriceEnvVar: "STRIPE_PARTNER_PLAN_PRICE_ID"
  }
}

export type CompanyBillingFields = Pick<
  Company,
  | "id"
  | "name"
  | "ownerAuthId"
  | "isManaged"
  | "plan"
  | "planOverride"
  | "billingPlan"
  | "billingStatus"
  | "billingCancelAtPeriodEnd"
  | "billingCurrentPeriodEnd"
  | "billingUpdatedAt"
  | "stripeCustomerId"
  | "stripeSubscriptionId"
>

export type CompanyPlanPricing = CompanyBillingDefinition & {
  label: string
  priceId: string | null
  priceLabel: string | null
  isConfigured: boolean
}

export function isBillableCompanyPlanId(value: unknown): value is BillableCompanyPlanId {
  return typeof value === "string" && billableCompanyPlanIds.includes(value as BillableCompanyPlanId)
}

export function getBillableCompanyPlanDefinition(planId: BillableCompanyPlanId) {
  return COMPANY_BILLING_DEFINITIONS[planId]
}

export function listBillableCompanyPlanDefinitions() {
  return billableCompanyPlanIds.map((planId) => {
    const definition = getBillableCompanyPlanDefinition(planId)
    return {
      ...definition,
      label: getCompanyPlanLabel(planId)
    }
  })
}

export function getStripePriceIdForCompanyPlan(planId: BillableCompanyPlanId) {
  const envVar = getBillableCompanyPlanDefinition(planId).stripePriceEnvVar
  return process.env[envVar]?.trim() || null
}

export function getCompanyPlanIdForStripePriceId(priceId: string | null | undefined) {
  if (!priceId) {
    return null
  }

  return billableCompanyPlanIds.find((planId) => getStripePriceIdForCompanyPlan(planId) === priceId) ?? null
}

export function formatStripeRecurringPrice(price: Stripe.Price) {
  if (typeof price.unit_amount !== "number") {
    return null
  }

  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: price.currency.toUpperCase(),
    maximumFractionDigits: 2
  }).format(price.unit_amount / 100)

  const interval = price.recurring?.interval

  if (interval === "month") {
    return `${amount}/month`
  }

  if (interval === "year") {
    return `${amount}/year`
  }

  if (interval) {
    return `${amount}/${interval}`
  }

  return amount
}

export async function listCompanyPlanPricing(): Promise<CompanyPlanPricing[]> {
  const definitions = listBillableCompanyPlanDefinitions()

  let stripe: Stripe | null = null

  try {
    stripe = getStripe()
  } catch {
    stripe = null
  }

  return Promise.all(
    definitions.map(async (definition) => {
      const priceId = getStripePriceIdForCompanyPlan(definition.id)

      if (!stripe || !priceId) {
        return {
          ...definition,
          priceId,
          priceLabel: null,
          isConfigured: Boolean(priceId)
        }
      }

      try {
        const price = await stripe.prices.retrieve(priceId)

        return {
          ...definition,
          priceId,
          priceLabel: formatStripeRecurringPrice(price),
          isConfigured: true
        }
      } catch {
        return {
          ...definition,
          priceId,
          priceLabel: null,
          isConfigured: true
        }
      }
    })
  )
}

export function getCompanyBillingStatusLabel(status: CompanyBillingStatus) {
  const labels: Record<CompanyBillingStatus, string> = {
    inactive: "Inactive",
    trialing: "Trialing",
    active: "Active",
    past_due: "Past due",
    canceled: "Canceled",
    incomplete: "Incomplete",
    incomplete_expired: "Incomplete expired",
    unpaid: "Unpaid",
    paused: "Paused"
  }

  return labels[status]
}

export function hasActiveCompanyBillingStatus(status: CompanyBillingStatus | null | undefined) {
  return status === "active" || status === "trialing"
}

export function hasManagedBillingSubscription(company: Pick<CompanyBillingFields, "stripeCustomerId" | "stripeSubscriptionId" | "billingStatus">) {
  if (!company.stripeCustomerId || !company.stripeSubscriptionId) {
    return false
  }

  return company.billingStatus !== "inactive" && company.billingStatus !== "canceled" && company.billingStatus !== "incomplete_expired"
}

export function getCompanyBasePlanForBillingState(planId: BillableCompanyPlanId | null, status: CompanyBillingStatus) {
  return planId && hasActiveCompanyBillingStatus(status) ? planId : DEFAULT_COMPANY_PLAN_ID
}

export function getCompanyPlanIdFromStripeSubscription(subscription: Stripe.Subscription) {
  const metadataPlanId = subscription.metadata?.planId
  if (isBillableCompanyPlanId(metadataPlanId)) {
    return metadataPlanId
  }

  for (const item of subscription.items.data) {
    const priceId = typeof item.price?.id === "string" ? item.price.id : null
    const matchedPlanId = getCompanyPlanIdForStripePriceId(priceId)

    if (matchedPlanId) {
      return matchedPlanId
    }
  }

  return null
}

async function getCompanyForStripeSubscription(subscription: Stripe.Subscription) {
  const companyId = typeof subscription.metadata?.companyId === "string" ? subscription.metadata.companyId : null

  if (companyId) {
    const company = await getCompanyById(companyId)
    if (company) {
      return company
    }
  }

  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id

  const [company] = await db
    .select()
    .from(companies)
    .where(
      or(
        eq(companies.stripeSubscriptionId, subscription.id),
        customerId ? eq(companies.stripeCustomerId, customerId) : eq(companies.stripeSubscriptionId, subscription.id)
      )!
    )
    .limit(1)

  return company ?? null
}

export async function attachCompanyStripeCustomer(input: {
  companyId: string
  stripeCustomerId: string
}) {
  const [updated] = await db
    .update(companies)
    .set({
      stripeCustomerId: input.stripeCustomerId,
      billingUpdatedAt: new Date()
    })
    .where(eq(companies.id, input.companyId))
    .returning()

  return updated ?? null
}

export async function syncCompanyBillingFromStripeSubscription(subscription: Stripe.Subscription) {
  const company = await getCompanyForStripeSubscription(subscription)

  if (!company) {
    return null
  }

  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null
  const billingPlan = getCompanyPlanIdFromStripeSubscription(subscription)
  const billingStatus = subscription.status as CompanyBillingStatus
  const nextBasePlan = getCompanyBasePlanForBillingState(billingPlan, billingStatus)
  const nextPlanAssignedAt = company.plan === nextBasePlan ? company.planAssignedAt : new Date()
  const currentPeriodEndTimestamp = subscription.items.data.reduce<number | null>((latest, item) => {
    if (typeof item.current_period_end !== "number") {
      return latest
    }

    if (latest === null || item.current_period_end > latest) {
      return item.current_period_end
    }

    return latest
  }, null)
  const currentPeriodEnd = currentPeriodEndTimestamp ? new Date(currentPeriodEndTimestamp * 1000) : company.billingCurrentPeriodEnd

  const [updated] = await db
    .update(companies)
    .set({
      plan: nextBasePlan,
      billingPlan,
      billingStatus,
      billingCancelAtPeriodEnd: subscription.cancel_at_period_end,
      billingCurrentPeriodEnd: currentPeriodEnd,
      billingUpdatedAt: new Date(),
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      planAssignedAt: nextPlanAssignedAt
    })
    .where(eq(companies.id, company.id))
    .returning()

  return updated ?? company
}

export async function syncCompanyBillingFromCheckoutSession(session: Stripe.Checkout.Session, stripeClient?: Stripe) {
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id

  if (!subscriptionId) {
    return null
  }

  const stripe = stripeClient ?? getStripe()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"]
  })

  return syncCompanyBillingFromStripeSubscription(subscription)
}

export async function syncCompanyBillingFromCheckoutSessionId(sessionId: string, stripeClient?: Stripe) {
  const stripe = stripeClient ?? getStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  return syncCompanyBillingFromCheckoutSession(session, stripe)
}

export async function getCompanyByStripeCustomerId(stripeCustomerId: string) {
  const [company] = await db.select().from(companies).where(eq(companies.stripeCustomerId, stripeCustomerId)).limit(1)
  return company ?? null
}

export function getBillingCheckoutErrorMessage(error?: string) {
  if (error === "invalid_plan") {
    return "Select a valid paid plan."
  }

  if (error === "billing_unavailable") {
    return "Billing is not fully configured yet. Contact HireSalem for support."
  }

  if (error === "company_not_found") {
    return "Create your business profile before starting billing."
  }

  if (error === "manage_existing_subscription") {
    return "This business already has a subscription. Use Manage subscription to change or cancel it."
  }

  if (error === "subscription_required") {
    return "No active subscription was found for this business yet."
  }

  if (error === "confirm_required") {
    return "Review the plan change details and confirm before updating your subscription."
  }

  return null
}
