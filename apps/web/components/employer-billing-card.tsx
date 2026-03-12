import { getCompanyBillingStatusLabel, hasManagedBillingSubscription, type CompanyBillingFields, type CompanyPlanPricing } from "@/lib/company-billing"
import type { ResolvedCompanyPlan } from "@repo/db/plans"

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
  isAdmin = false
}: {
  company: CompanyBillingFields
  plan: ResolvedCompanyPlan
  pricing: CompanyPlanPricing[]
  isAdmin?: boolean
}) {
  const hasManagedSubscription = hasManagedBillingSubscription(company)
  const renewalDate = formatDate(company.billingCurrentPeriodEnd)

  return (
    <section id="pricing" className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Billing</p>
        <h2 className="text-2xl font-semibold text-slate-950">Pricing and subscription</h2>
        <p className="text-sm text-slate-600">
          Choose the plan that fits your hiring needs. Billing updates the company&apos;s base plan automatically, while any admin override still applies on
          top for support cases.
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
        {!isAdmin && hasManagedSubscription ? (
          <form action="/api/billing/portal" method="post" className="mt-4">
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Manage subscription
            </button>
          </form>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {pricing.map((item) => {
          const isCurrentSubscription = company.billingPlan === item.id && (company.billingStatus === "active" || company.billingStatus === "trialing")

          return (
            <article
              key={item.id}
              className={`flex h-full flex-col rounded-2xl border p-5 ${plan.effectivePlanId === item.id ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"}`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-950">{item.label}</h3>
                  {plan.effectivePlanId === item.id ? (
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">Current</span>
                  ) : null}
                </div>
                <p className="text-2xl font-semibold text-slate-950">{item.priceLabel ?? "Contact support"}</p>
                <p className="text-sm leading-6 text-slate-600">{item.description}</p>
              </div>

              <ul className="mt-4 flex-1 list-disc space-y-2 pl-5 text-sm text-slate-700">
                {item.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <div className="mt-5">
                {isAdmin ? (
                  <p className="text-sm text-slate-600">Use a business account to test self-serve billing. Admin overrides still work from the admin screen.</p>
                ) : hasManagedSubscription ? (
                  <form action="/api/billing/portal" method="post">
                    <button type="submit" className="w-full rounded border px-4 py-2 text-sm font-medium text-slate-900">
                      {isCurrentSubscription ? "Manage current subscription" : "Change in billing portal"}
                    </button>
                  </form>
                ) : item.isConfigured ? (
                  <form action="/api/billing/checkout" method="post">
                    <input type="hidden" name="planId" value={item.id} />
                    <button type="submit" className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                      {plan.effectivePlanId === item.id ? "Subscribe to keep this plan" : `Choose ${item.label}`}
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-slate-600">This plan is not fully configured for self-serve checkout yet. Contact HireSalem for support.</p>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
