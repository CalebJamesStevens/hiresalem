import { SavedJobsManager } from "@/components/saved-jobs-manager"
import { requirePageRoles } from "@/lib/page-auth"
import { listSavedJobsForUser } from "@/lib/saved-jobs"

export default async function DashboardSavedJobsPage() {
  const user = await requirePageRoles(["user", "business", "admin"], "/dashboard/saved-jobs")
  const savedJobs = await listSavedJobsForUser(user.id)

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Saved jobs</h1>
        <p className="text-slate-600">Keep a shortlist of roles you want to revisit and get email alerts when their status changes.</p>
      </div>
      <SavedJobsManager initialSavedJobs={savedJobs} />
    </section>
  )
}
