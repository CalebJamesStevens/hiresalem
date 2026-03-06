import { JobForm } from "@/components/job-form"
import { getCompanyByOwnerAuthId } from "@/lib/companies"
import { hasRole } from "@/lib/authz"
import { requirePageRoles } from "@/lib/page-auth"
import Link from "next/link"

export default async function PostJobPage() {
  const user = await requirePageRoles(["business", "admin"], "/post-job")
  const isAdmin = hasRole(user.roles, "admin")
  const company = isAdmin ? null : await getCompanyByOwnerAuthId(user.id)

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Post a job</h1>
      {!isAdmin && !company ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Finish your business setup before posting. <Link href="/become-business" className="underline">Create your company profile</Link>.
        </p>
      ) : company ? (
        <p className="text-sm text-slate-600">Posting as {company.name}.</p>
      ) : null}
      <JobForm disabled={!isAdmin && !company} />
    </section>
  )
}
