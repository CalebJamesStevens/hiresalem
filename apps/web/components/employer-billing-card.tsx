import { getCompanyBillingStatusLabel, hasManagedBillingSubscription, type CompanyBillingFields, type CompanyPlanPricing } from "@/lib/company-billing"
import { EMPLOYER_ADD_ONS, EMPLOYER_PRICING_PLANS } from "@/lib/employer-pricing"
import { EmployerAddOnCheckoutButton } from "@/components/employer-add-on-checkout-button"
import { PlanSwitchButton } from "@/components/plan-switch-button"
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from "@/lib/support"
import type { CompanyPlanId, ResolvedCompanyPlan } from "@repo/db/plans"

function formatDate(value: Date | null) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(value)
}

export function EmployerBillingCard({
  company,
  plan,
  pricing,
  isAdmin = false,
  selectedPlanId
}: {
  company: CompanyBillingFields
  plan: ResolvedCompanyPlan
  pricing: CompanyPlanPricing[]
  isAdmin?: boolean
  selectedPlanId?: CompanyPlanId | null
}) {
  const hasManagedSubscription = hasManagedBillingSubscription(company)
  const renewalDate = formatDate(company.billingCurrentPeriodEnd)
  const pricingById = new Map(pricing.map((item) => [item.id, item]))

  return (
    <section id="pricing" className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Billing</p>
        <h2 className="text-2xl font-semibold text-slate-950">Pricing and subscription</h2>
        <p className="text-sm text-slate-600">
          Choose the plan that fits your hiring needs. Billing updates the company&apos;s base plan automatically, while any admin override still applies on
          top for support cases.
        </p>
        <p className="text-sm text-slate-600">
          Questions about plan changes or invoicing?{" "}
          <a href={SUPPORT_EMAIL_HREF} className="font-medium text-slate-900 underline underline-offset-4">
            Email {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p>
          Effective plan: <span className="font-medium text-slate-900">{plan.label}</span>
        </p>
        <p className="mt-1">
          Billing status: <span className="font-medium text-slate-900">{getCompanyBillingStatusLabel(company.billingStatus)}</span>
        </p>
        {company.billingPlan ? (
          <p className="mt-1">
            Subscription plan: <span className="font-medium text-slate-900">{pricing.find((item) => item.id === company.billingPlan)?.label ?? company.billingPlan}</span>
          </p>
        ) : null}
        {renewalDate ? (
          <p className="mt-1">
            {company.billingCancelAtPeriodEnd ? "Access scheduled to end" : "Current period ends"}:{" "}
            <span className="font-medium text-slate-900">{renewalDate}</span>
          </p>
        ) : null}
        {plan.overridePlanId ? (
          <p className="mt-2 text-indigo-700">A manual admin override is active right now. Billing still syncs the base plan underneath that override.</p>
        ) : null}
        {company.isManaged ? <p className="mt-2 text-slate-700">Managed account: HireSalem can coordinate directly with your team on profile and billing support.</p> : null}
        {!isAdmin && hasManagedSubscription ? (
          <form action="/api/billing/portal" method="post" className="mt-4">
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Billing details and cancellation
            </button>
          </form>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {EMPLOYER_PRICING_PLANS.map((planOption) => {
          const pricingItem = planOption.id === "free" ? null : pricingById.get(planOption.id)
          const isCurrentSubscription = company.billingPlan === planOption.id && (company.billingStatus === "active" || company.billingStatus === "trialing")
          const isCurrentEffectivePlan = plan.effectivePlanId === planOption.id
          const isSelectedPlan = Boolean(selectedPlanId) && selectedPlanId === planOption.id
          const isPaidPlan = planOption.id !== "free"

          return (
            <article
              key={planOption.id}
              className={`flex h-full flex-col rounded-2xl border p-5 ${
                isCurrentEffectivePlan ? "border-slate-900 bg-slate-50" : isSelectedPlan ? "border-indigo-400 bg-indigo-50/40" : "border-slate-200 bg-white"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-950">{planOption.name}</h3>
                  {isCurrentEffectivePlan ? (
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">Current</span>
                  ) : isSelectedPlan ? (
                    <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">Selected</span>
                  ) : null}
                </div>
                <p className="text-2xl font-semibold text-slate-950">{pricingItem?.priceLabel ?? planOption.priceLabel}</p>
                <p className="text-sm leading-6 text-slate-600">{pricingItem?.description ?? planOption.description}</p>
              </div>

              <ul className="mt-4 flex-1 list-disc space-y-2 pl-5 text-sm text-slate-700">
                {(pricingItem?.features ?? planOption.features).map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <div className="mt-5">
                {isAdmin ? (
                  <p className="text-sm text-slate-600">Use a business account to test self-serve billing. Admin overrides still work from the admin screen.</p>
                ) : planOption.id === "free" ? (
                  hasManagedSubscription ? (
                    <p className="text-sm text-slate-600">Community stays available as the fallback tier if you cancel paid billing from billing details.</p>
                  ) : (
                    <p className="text-sm text-slate-600">
                      Community is included with every employer account. Upgrade only when you need more live jobs or stronger visibility.
                    </p>
                  )
                ) : hasManagedSubscription ? (
                  isCurrentSubscription ? (
                    <form action="/api/billing/portal" method="post">
                      <button type="submit" className="w-full rounded border px-4 py-2 text-sm font-medium text-slate-900">
                        Billing details and cancellation
                      </button>
                    </form>
                  ) : isPaidPlan ? (
                    <div className="space-y-2">
                      <PlanSwitchButton currentPlanLabel={plan.label} targetPlanId={planOption.id} targetPlanLabel={planOption.name} />
                      <p className="text-xs leading-5 text-slate-500">
                        Changes are confirmed on the next step. Use billing details for payment method changes or cancellation.
                      </p>
                    </div>
                  ) : null
                ) : pricingItem?.isConfigured ? (
                  <form action="/api/billing/checkout" method="post">
                    <input type="hidden" name="planId" value={planOption.id} />
                    <button type="submit" className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                      {isCurrentEffectivePlan
                        ? "Subscribe to keep this plan"
                        : isSelectedPlan
                          ? `Continue with ${planOption.name}`
                          : `Choose ${planOption.name}`}
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-slate-600">
                    This plan is not fully configured for self-serve checkout yet.{" "}
                    <a href={SUPPORT_EMAIL_HREF} className="font-medium text-slate-900 underline underline-offset-4">
                      Email {SUPPORT_EMAIL}
                    </a>
                    .
                  </p>
                )}
              </div>
            </article>
          )
        })}
      </div>

      <div id="add-ons" className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-950">Need a quick boost?</h3>
          <p className="text-sm text-slate-600">Add-ons are available for employers that want a short-term push without changing plans.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {EMPLOYER_ADD_ONS.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.priceLabel}</p>
              <h4 className="mt-1 text-base font-semibold text-slate-950">{item.title}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              {item.title === "The Extra Slot" && !isAdmin && plan.entitlements.maxActiveJobs !== null ? (
                <div className="mt-4">
                  <EmployerAddOnCheckoutButton addOnId="extra_slot" label="Buy Extra Slot" className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white" />
                </div>
              ) : null}
              {item.title === "The Extra Slot" && !isAdmin && plan.entitlements.maxActiveJobs === null ? (
                <p className="mt-4 text-xs text-slate-500">Extra Slot is only relevant on Community accounts that need a temporary third live listing.</p>
              ) : null}
              {item.title !== "The Extra Slot" ? (
                <p className="mt-4 text-xs text-slate-500">Choose a live job from your jobs dashboard to purchase this add-on.</p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
