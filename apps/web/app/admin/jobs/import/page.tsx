import { AdminJobImportPanel } from "@/components/admin-job-import-panel"
import { requirePageRoles } from "@/lib/page-auth"

export const dynamic = "force-dynamic"

export default async function AdminJobImportPage() {
  await requirePageRoles(["admin"], "/admin/jobs/import")

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-950">Batch import jobs</h1>
          <p className="max-w-3xl text-slate-600">
            Upload a normalized jobs JSON file and import it into production through the admin API. Use dry runs first, then re-run with dry run disabled once the counts look right.
          </p>
        </div>

        <form action="/api/admin/export" method="GET" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <label htmlFor="jobLimit" className="space-y-1 text-sm text-slate-700">
                <span className="font-medium text-slate-900">Jobs to export</span>
                <input
                  id="jobLimit"
                  name="jobLimit"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue="5"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </label>
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input type="checkbox" name="allJobs" className="mt-0.5 h-4 w-4 rounded border-slate-300" />
                <span>Export all jobs.</span>
              </label>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <label htmlFor="jobMaxAgeDays" className="space-y-1 text-sm text-slate-700">
                <span className="font-medium text-slate-900">Days back</span>
                <input
                  id="jobMaxAgeDays"
                  name="jobMaxAgeDays"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue="30"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </label>
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input type="checkbox" name="allTime" className="mt-0.5 h-4 w-4 rounded border-slate-300" />
                <span>Export from all time.</span>
              </label>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              Download export
            </button>
            <p className="text-xs text-slate-500">Companies are always exported in full. Check both boxes to export everything.</p>
          </div>
        </form>
      </div>

      <AdminJobImportPanel />
    </section>
  )
}
