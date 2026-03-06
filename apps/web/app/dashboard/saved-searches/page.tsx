import { SavedSearchManager } from "@/components/saved-search-manager"
import { requirePageRoles } from "@/lib/page-auth"
import { listSavedSearchesForUser } from "@/lib/saved-searches"

export default async function DashboardSavedSearchesPage() {
  const user = await requirePageRoles(["user", "business", "admin"], "/dashboard/saved-searches")
  const savedSearches = await listSavedSearchesForUser(user.id)

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Saved searches</h1>
        <p className="text-slate-600">Reopen a saved search, toggle daily alerts, or remove it when it is no longer useful.</p>
      </div>
      <SavedSearchManager initialSavedSearches={savedSearches} defaultRecipientEmail={user.email} />
    </section>
  )
}
