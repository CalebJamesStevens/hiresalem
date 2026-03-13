import { redirect } from "next/navigation"

import { getCompanyById, getCompanyByOwnerAuthId, listCompanies } from "@/lib/companies"
import { getEmployerAnalyticsSnapshot } from "@/lib/employer-analytics"
import { hasRole } from "@/lib/authz"
import { requirePageRoles } from "@/lib/page-auth"

type DashboardAnalyticsPageProps = {
  searchParams: Promise<{
    companyId?: string
  }>
}

function formatTrendValue(value: number) {
  return value.toLocaleString()
}

export const dynamic = "force-dynamic"

export default async function DashboardAnalyticsPage({ searchParams }: DashboardAnalyticsPageProps) {
  const params = await searchParams
  const user = await requirePageRoles(["business", "admin"], "/dashboard/analytics")
  const isAdmin = hasRole(user.roles, "admin")
  const [ownedCompany, companyOptions] = await Promise.all([getCompanyByOwnerAuthId(user.id), isAdmin ? listCompanies() : Promise.resolve([])])

  if (!isAdmin && !ownedCompany) {
    redirect("/become-business")
  }

  const selectedCompanyId = isAdmin ? params.companyId?.trim() || ownedCompany?.id || companyOptions[0]?.id || null : ownedCompany?.id ?? null
  const company = selectedCompanyId ? await getCompanyById(selectedCompanyId) : null
  const snapshot = company ? await getEmployerAnalyticsSnapshot(company.id) : null

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Employer analytics</h1>
        <p className="text-slate-600">Track how often candidates view your jobs, click apply, and open your company page.</p>
      </div>

      {isAdmin ? (
        <form action="/dashboard/analytics" className="rounded-2xl border bg-white p-4 shadow-sm">
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

      {!company || !snapshot ? (
        <p className="rounded border bg-white px-4 py-3 text-sm text-slate-600">No company selected yet.</p>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Job views</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{formatTrendValue(snapshot.totals30.jobViews)}</p>
              <p className="mt-2 text-sm text-slate-600">7 days: {formatTrendValue(snapshot.totals7.jobViews)}</p>
            </article>
            <article className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Apply clicks</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{formatTrendValue(snapshot.totals30.applyClicks)}</p>
              <p className="mt-2 text-sm text-slate-600">7 days: {formatTrendValue(snapshot.totals7.applyClicks)}</p>
            </article>
            <article className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Company profile views</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{formatTrendValue(snapshot.totals30.companyViews)}</p>
              <p className="mt-2 text-sm text-slate-600">7 days: {formatTrendValue(snapshot.totals7.companyViews)}</p>
            </article>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-950">30-day trend</h2>
              <p className="text-sm text-slate-600">Daily totals across job views, apply clicks, and company page views.</p>
            </div>
            <div className="mt-4 space-y-2">
              {snapshot.dailySeries.map((day) => (
                <div key={day.day} className="grid grid-cols-[120px_repeat(3,minmax(0,1fr))] gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm">
                  <span className="font-medium text-slate-900">{day.day}</span>
                  <span className="text-slate-600">Views: {day.jobViews}</span>
                  <span className="text-slate-600">Applies: {day.applyClicks}</span>
                  <span className="text-slate-600">Company: {day.companyViews}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-950">Per-job activity</h2>
              <p className="text-sm text-slate-600">Recent job views and apply clicks by listing.</p>
            </div>
            {snapshot.jobs.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">No analytics events recorded yet for this company.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {snapshot.jobs.map((job) => (
                  <div key={job.jobId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{job.jobTitle ?? "Deleted job"}</p>
                      <p className="text-sm text-slate-600">{job.jobSlug ? `/jobs/${job.jobSlug}` : "Unavailable slug"}</p>
                    </div>
                    <div className="flex gap-6 text-sm text-slate-600">
                      <span>Views: {job.jobViews}</span>
                      <span>Applies: {job.applyClicks}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  )
}
