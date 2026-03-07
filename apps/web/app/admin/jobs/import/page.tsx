import { AdminJobImportPanel } from "@/components/admin-job-import-panel"
import { requirePageRoles } from "@/lib/page-auth"

export const dynamic = "force-dynamic"

export default async function AdminJobImportPage() {
  await requirePageRoles(["admin"], "/admin/jobs/import")

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-950">Batch import jobs</h1>
        <p className="max-w-3xl text-slate-600">
          Upload a normalized jobs JSON file and import it into production through the admin API. Use dry runs first, then re-run with dry run disabled once the counts look right.
        </p>
      </div>

      <AdminJobImportPanel />
    </section>
  )
}
