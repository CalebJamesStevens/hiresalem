import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getSessionSafe } from "@/lib/session"
import { createSavedSearch } from "@/lib/saved-searches"

function appendSavedFlag(path: string) {
  const separator = path.includes("?") ? "&" : "?"
  return `${path}${separator}saved=1`
}

export async function SaveSearchPanel({ currentPath }: { currentPath: string }) {
  const session = await getSessionSafe()
  const userId = session?.user?.id

  if (!userId) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
        <Link href={`/signin?callbackUrl=${encodeURIComponent(currentPath)}`} className="font-medium underline">
          Sign in
        </Link>{" "}
        to save this search and come back to it later.
      </div>
    )
  }

  const authenticatedUserId = userId

  async function saveSearchAction(formData: FormData) {
    "use server"

    const name = String(formData.get("name") ?? "")
    const queryString = String(formData.get("queryString") ?? currentPath)

    await createSavedSearch({
      userAuthId: authenticatedUserId,
      name,
      queryString
    })

    revalidatePath("/jobs")
    revalidatePath("/dashboard/saved-searches")
    redirect(appendSavedFlag(currentPath))
  }

  return (
    <form action={saveSearchAction} className="rounded-2xl border bg-white p-4 shadow-sm">
      <input type="hidden" name="queryString" value={currentPath} />
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <label className="flex-1 space-y-1">
          <span className="text-sm font-medium text-slate-700">Save this search</span>
          <input
            name="name"
            required
            maxLength={80}
            defaultValue="My Salem job search"
            className="w-full rounded-xl border px-3 py-2"
          />
        </label>
        <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Save search
        </button>
      </div>
    </form>
  )
}
