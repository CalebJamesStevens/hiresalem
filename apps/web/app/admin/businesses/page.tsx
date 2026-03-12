import { EmployerPlanSummaryCard } from "@/components/employer-plan-summary-card"
import { getCompanyById, listCompanies } from "@/lib/companies"
import { requirePageRoles } from "@/lib/page-auth"
import { companyPlanIds, getCompanyPlanLabel, resolveCompanyPlan } from "@repo/db/plans"

type AdminBusinessesPageProps = {
  searchParams: Promise<{
    companyId?: string
    updated?: string
    error?: string
  }>
}

function getErrorMessage(error?: string) {
  if (error === "invalid_company_plan") {
    return "Select a valid business plan."
  }

  if (error === "plan_override_reason_length") {
    return "Internal note must be 500 characters or fewer."
  }

  if (error === "invalid_company_plan_update") {
    return "Unable to update the business plan. Check the fields and try again."
  }

  return null
}

export const dynamic = "force-dynamic"

export default async function AdminBusinessesPage({ searchParams }: AdminBusinessesPageProps) {
  const params = await searchParams
  await requirePageRoles(["admin"], "/admin/businesses")

  const companyOptions = await listCompanies()
  const selectedCompanyId = params.companyId?.trim() || companyOptions[0]?.id || null
  const company = selectedCompanyId ? await getCompanyById(selectedCompanyId) : null
  const resolvedPlan = company ? resolveCompanyPlan(company) : null
  const errorMessage = getErrorMessage(params.error)

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Business plans</h1>
        <p className="text-slate-600">Manually assign pilot plans, chamber trials, and override notes until billing is wired into the product.</p>
      </div>

      {params.updated === "1" ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Business plan updated.</p>
      ) : null}

      {errorMessage ? <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}

      <form action="/admin/businesses" className="rounded-2xl border bg-white p-4 shadow-sm">
        <label htmlFor="companyId" className="block text-sm font-medium text-slate-900">
          Select company
        </label>
        <div className="mt-2 flex flex-wrap gap-3">
          <select id="companyId" name="companyId" defaultValue={selectedCompanyId ?? ""} className="min-w-[18rem] rounded border px-3 py-2">
            {companyOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} ({option.slug}) - {resolveCompanyPlan(option).label}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
            Load company
          </button>
        </div>
      </form>

      {!company || !resolvedPlan ? (
        <p className="rounded border bg-white px-4 py-3 text-sm text-slate-600">No company selected yet.</p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <form action={`/api/admin/companies/${company.id}/plan`} method="post" className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
              <input type="hidden" name="returnTo" value={`/admin/businesses?companyId=${company.id}`} />

              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-950">{company.name}</h2>
                <p className="text-sm text-slate-600">
                  /jobs/company/{company.slug} • owner {company.ownerAuthId}
                </p>
                <p className="text-sm text-slate-600">Last plan update: {company.planAssignedAt.toLocaleDateString()}</p>
                {company.planOverrideReason ? <p className="text-sm text-slate-600">Current internal note: {company.planOverrideReason}</p> : null}
              </div>

              <div className="space-y-1">
                <label htmlFor="plan" className="text-sm font-medium text-slate-900">
                  Base plan
                </label>
                <select id="plan" name="plan" defaultValue={company.plan} className="w-full rounded border px-3 py-2">
                  {companyPlanIds.map((planId) => (
                    <option key={planId} value={planId}>
                      {getCompanyPlanLabel(planId)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="planOverride" className="text-sm font-medium text-slate-900">
                  Manual override
                </label>
                <select id="planOverride" name="planOverride" defaultValue={company.planOverride ?? ""} className="w-full rounded border px-3 py-2">
                  <option value="">No override</option>
                  {companyPlanIds.map((planId) => (
                    <option key={planId} value={planId}>
                      {getCompanyPlanLabel(planId)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">Use overrides for chamber pilots, one-off trials, or temporary manual entitlements.</p>
              </div>

              <div className="space-y-1">
                <label htmlFor="planOverrideReason" className="text-sm font-medium text-slate-900">
                  Internal note
                </label>
                <textarea
                  id="planOverrideReason"
                  name="planOverrideReason"
                  rows={4}
                  defaultValue={company.planOverrideReason ?? ""}
                  placeholder="Chamber pilot, founder comp, manual featured-job trial, etc."
                  className="w-full rounded border px-3 py-2"
                />
              </div>

              <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
                Save business plan
              </button>
            </form>

            <EmployerPlanSummaryCard plan={resolvedPlan} title="Effective plan" showAssignmentDetails />
          </div>
        </>
      )}
    </section>
  )
}
