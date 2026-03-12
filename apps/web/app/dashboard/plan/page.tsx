import { EmployerPlanSummaryCard } from "@/components/employer-plan-summary-card"
import { getCompanyById, getCompanyByOwnerAuthId, listCompanies } from "@/lib/companies"
import { hasRole } from "@/lib/authz"
import { requirePageRoles } from "@/lib/page-auth"
import { resolveCompanyPlan } from "@repo/db/plans"
import { redirect } from "next/navigation"

type DashboardPlanPageProps = {
  searchParams: Promise<{
    companyId?: string
  }>
}

export const dynamic = "force-dynamic"

export default async function DashboardPlanPage({ searchParams }: DashboardPlanPageProps) {
  const params = await searchParams
  const user = await requirePageRoles(["business", "admin"], "/dashboard/plan")
  const isAdmin = hasRole(user.roles, "admin")
  const [ownedCompany, companyOptions] = await Promise.all([getCompanyByOwnerAuthId(user.id), isAdmin ? listCompanies() : Promise.resolve([])])

  if (!isAdmin && !ownedCompany) {
    redirect("/become-business")
  }

  const selectedCompanyId = isAdmin ? params.companyId?.trim() || ownedCompany?.id || companyOptions[0]?.id || null : ownedCompany?.id ?? null
  const company = selectedCompanyId ? await getCompanyById(selectedCompanyId) : null
  const resolvedPlan = company ? resolveCompanyPlan(company) : null

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Plan and upgrades</h1>
        <p className="text-slate-600">Review what your current plan includes now, what stays locked, and what can be enabled manually during the pilot phase.</p>
      </div>

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
        <EmployerPlanSummaryCard plan={resolvedPlan} />
      )}
    </section>
  )
}
