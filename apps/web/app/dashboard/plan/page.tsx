import { EmployerBillingCard } from "@/components/employer-billing-card"
import { EmployerPlanSummaryCard } from "@/components/employer-plan-summary-card"
import { getBillingCheckoutErrorMessage, listCompanyPlanPricing, syncCompanyBillingFromCheckoutSessionId } from "@/lib/company-billing"
import { getEmployerAddOnCheckoutErrorMessage, syncEmployerAddOnFromCheckoutSessionId } from "@/lib/employer-add-ons"
import { getEmployerSelfServePlan } from "@/lib/employer-self-serve"
import { getCompanyById, getCompanyByOwnerAuthId, listCompanies } from "@/lib/companies"
import { hasRole } from "@/lib/authz"
import { requirePageRoles } from "@/lib/page-auth"
import { resolveCompanyPlan } from "@repo/db/plans"
import { redirect } from "next/navigation"

type DashboardPlanPageProps = {
  searchParams: Promise<{
    companyId?: string
    checkout?: string
    billing?: string
    billingError?: string
    session_id?: string
    addOn?: string
    addOnError?: string
    selectedPlan?: string
    onboarding?: string
  }>
}

export const dynamic = "force-dynamic"

export default async function DashboardPlanPage({ searchParams }: DashboardPlanPageProps) {
  const params = await searchParams
  const selectedPlan = params.selectedPlan ? getEmployerSelfServePlan(params.selectedPlan) : null
  const user = await requirePageRoles(["business", "admin"], "/dashboard/plan")
  const isAdmin = hasRole(user.roles, "admin")
  const [ownedCompany, companyOptions] = await Promise.all([getCompanyByOwnerAuthId(user.id), isAdmin ? listCompanies() : Promise.resolve([])])

  if (!isAdmin && !ownedCompany) {
    redirect(`/become-business?plan=${selectedPlan ?? "free"}`)
  }

  const selectedCompanyId = isAdmin ? params.companyId?.trim() || ownedCompany?.id || companyOptions[0]?.id || null : ownedCompany?.id ?? null

  if (!isAdmin && params.checkout === "success" && params.session_id) {
    try {
      await syncCompanyBillingFromCheckoutSessionId(params.session_id)
    } catch {
      // The webhook is still the source of truth; this is only a best-effort UX sync.
    }
  }

  if (!isAdmin && params.addOn === "success" && params.session_id) {
    try {
      await syncEmployerAddOnFromCheckoutSessionId(params.session_id)
    } catch {
      // Webhook is still the source of truth; this is only a best-effort UX sync.
    }
  }

  const [company, pricing] = await Promise.all([selectedCompanyId ? getCompanyById(selectedCompanyId) : Promise.resolve(null), listCompanyPlanPricing()])
  const resolvedPlan = company ? resolveCompanyPlan(company) : null
  const billingErrorMessage = getBillingCheckoutErrorMessage(params.billingError)
  const addOnErrorMessage = getEmployerAddOnCheckoutErrorMessage(params.addOnError)
  const checkoutCompleted = params.checkout === "success"
  const checkoutCanceled = params.checkout === "canceled"
  const billingReturned = params.billing === "returned"
  const billingUpdated = params.billing === "updated"

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Plan and upgrades</h1>
        <p className="text-slate-600">Review Community, Standard, and Partner pricing, then manage subscription billing for your business account.</p>
      </div>

      {checkoutCompleted ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Checkout completed. Your plan should update as soon as Stripe confirms the subscription.
        </p>
      ) : null}

      {checkoutCanceled ? (
        <p className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">Checkout was canceled. No billing changes were made.</p>
      ) : null}

      {billingReturned ? (
        <p className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Returned from the billing portal. Subscription updates usually appear here within a few seconds of Stripe sending the webhook.
        </p>
      ) : null}
      {billingUpdated ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Subscription updated. Your plan and billing details have been refreshed from Stripe.
        </p>
      ) : null}

      {billingErrorMessage ? <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{billingErrorMessage}</p> : null}
      {params.onboarding === "1" && selectedPlan && selectedPlan !== "free" ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Business setup is complete. Continue below to start your {selectedPlan === "standard" ? "Standard" : "Partner"} subscription.
        </p>
      ) : null}
      {params.addOn === "success" ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Add-on checkout completed. Your billing and job state should update as soon as Stripe confirms the payment.
        </p>
      ) : null}
      {params.addOn === "canceled" ? (
        <p className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">Add-on checkout was canceled.</p>
      ) : null}
      {addOnErrorMessage ? <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{addOnErrorMessage}</p> : null}

      {isAdmin ? (
        <form action="/dashboard/plan" className="rounded-2xl border bg-white p-4 shadow-sm">
          <label htmlFor="companyId" className="block text-sm font-medium text-slate-900">
            Select company
          </label>
          <div className="mt-2 flex flex-wrap gap-3">
            <select id="companyId" name="companyId" defaultValue={selectedCompanyId ?? ""} className="min-w-[18rem] rounded border px-3 py-2">
              {companyOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} ({option.slug})
                </option>
              ))}
            </select>
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
              Load company
            </button>
          </div>
        </form>
      ) : null}

      {!company || !resolvedPlan ? (
        <p className="rounded border bg-white px-4 py-3 text-sm text-slate-600">No company selected yet.</p>
      ) : (
        <div className="space-y-6">
          <EmployerPlanSummaryCard plan={resolvedPlan} />
          <EmployerBillingCard
            company={company}
            plan={resolvedPlan}
            pricing={pricing}
            isAdmin={isAdmin}
            selectedPlanId={selectedPlan ?? undefined}
          />
        </div>
      )}
    </section>
  )
}
