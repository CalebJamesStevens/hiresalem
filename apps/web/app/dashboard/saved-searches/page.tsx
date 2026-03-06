import Link from "next/link"
import { revalidatePath } from "next/cache"

import { requirePageRoles } from "@/lib/page-auth"
import { deleteSavedSearch, listSavedSearchesForUser } from "@/lib/saved-searches"

export default async function DashboardSavedSearchesPage() {
  const user = await requirePageRoles(["user", "business", "admin"], "/dashboard/saved-searches")
  const savedSearches = await listSavedSearchesForUser(user.id)

  async function deleteSavedSearchAction(formData: FormData) {
    "use server"

    const id = String(formData.get("id") ?? "")
    if (!id) {
      return
    }

    await deleteSavedSearch({ id, userAuthId: user.id })
    revalidatePath("/dashboard/saved-searches")
    revalidatePath("/jobs")
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Saved searches</h1>
        <p className="text-slate-600">Reopen a saved search or remove it when it is no longer useful.</p>
      </div>

      {savedSearches.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">No saved searches yet</h2>
          <p className="mt-2 text-slate-600">Save a search from the public jobs page to keep its current filters.</p>
          <Link href="/jobs" className="mt-4 inline-block rounded-xl border px-4 py-2 font-medium">
            Browse jobs
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {savedSearches.map((savedSearch) => (
            <article key={savedSearch.id} className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{savedSearch.name}</h2>
                <p className="text-sm text-slate-600">{savedSearch.queryString}</p>
              </div>

              <div className="flex gap-3">
                <Link href={savedSearch.queryString} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                  Open search
                </Link>
                <form action={deleteSavedSearchAction}>
                  <input type="hidden" name="id" value={savedSearch.id} />
                  <button type="submit" className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700">
                    Delete
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
