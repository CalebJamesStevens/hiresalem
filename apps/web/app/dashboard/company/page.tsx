import Link from "next/link"
import { redirect } from "next/navigation"

import { hasRole } from "@/lib/authz"
import { getCompanyById, getCompanyByOwnerAuthId, listCompanies, normalizeCompanyWebsite, updateCompanyProfile } from "@/lib/companies"
import { requirePageRoles } from "@/lib/page-auth"

type DashboardCompanyPageProps = {
  searchParams: Promise<{
    companyId?: string
    updated?: string
    error?: string
  }>
}

function getErrorMessage(error?: string) {
  if (error === "company_not_found") {
    return "Company not found."
  }

  if (error === "company_name_length") {
    return "Company name must be at least 2 characters."
  }

  if (error === "invalid_website") {
    return "Website must be a valid URL."
  }

  if (error === "forbidden") {
    return "You do not have permission to edit that company."
  }

  return null
}

export const dynamic = "force-dynamic"

export default async function DashboardCompanyPage({ searchParams }: DashboardCompanyPageProps) {
  const params = await searchParams
  const user = await requirePageRoles(["business", "admin"], "/dashboard/company")
  const isAdmin = hasRole(user.roles, "admin")
  const [ownedCompany, companyOptions] = await Promise.all([getCompanyByOwnerAuthId(user.id), isAdmin ? listCompanies() : Promise.resolve([])])

  const selectedCompanyId = isAdmin ? params.companyId?.trim() || ownedCompany?.id || companyOptions[0]?.id || null : ownedCompany?.id ?? null
  const editableCompany = selectedCompanyId ? await getCompanyById(selectedCompanyId) : null

  if (!isAdmin && !ownedCompany) {
    redirect("/become-business")
  }

  if (!isAdmin && editableCompany?.ownerAuthId !== user.id) {
    redirect("/dashboard/company?error=forbidden")
  }

  const message = getErrorMessage(params.error)

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Company profile</h1>
        <p className="text-slate-600">Update the public company name and website tied to your HireSalem jobs.</p>
      </div>

      {params.updated === "1" ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Company profile updated.</p>
      ) : null}

      {message ? <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}

      {isAdmin ? (
        <form action="/dashboard/company" className="rounded border bg-white p-4">
          <label htmlFor="companyId" className="block text-sm font-medium text-slate-900">
            Select company
          </label>
          <div className="mt-2 flex flex-wrap gap-3">
            <select id="companyId" name="companyId" defaultValue={selectedCompanyId ?? ""} className="min-w-[18rem] rounded border px-3 py-2">
              {companyOptions.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} ({company.slug})
                </option>
              ))}
            </select>
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
              Load company
            </button>
          </div>
        </form>
      ) : null}

      {!editableCompany ? (
        <p className="rounded border bg-white px-4 py-3 text-sm text-slate-600">No company selected yet.</p>
      ) : (
        <form
          action={async (formData) => {
            "use server"

            const user = await requirePageRoles(["business", "admin"], "/dashboard/company")
            const isAdmin = hasRole(user.roles, "admin")
            const companyId = String(formData.get("companyId") ?? "").trim()
            const name = String(formData.get("name") ?? "").trim()
            const websiteInput = String(formData.get("website") ?? "")
            const website = normalizeCompanyWebsite(websiteInput)

            if (!companyId) {
              redirect("/dashboard/company?error=company_not_found")
            }

            const company = await getCompanyById(companyId)

            if (!company) {
              redirect("/dashboard/company?error=company_not_found")
            }

            if (!isAdmin && company.ownerAuthId !== user.id) {
              redirect("/dashboard/company?error=forbidden")
            }

            if (name.length < 2) {
              redirect(`/dashboard/company?companyId=${company.id}&error=company_name_length`)
            }

            if (websiteInput.trim() && !website) {
              redirect(`/dashboard/company?companyId=${company.id}&error=invalid_website`)
            }

            await updateCompanyProfile({
              id: company.id,
              name,
              website
            })

            redirect(`/dashboard/company?companyId=${company.id}&updated=1`)
          }}
          className="space-y-4 rounded border bg-white p-6"
        >
          <input type="hidden" name="companyId" value={editableCompany.id} />

          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">
              Company name
            </label>
            <input id="name" name="name" required defaultValue={editableCompany.name} className="w-full rounded border px-3 py-2" />
          </div>

          <div className="space-y-1">
            <label htmlFor="website" className="text-sm font-medium">
              Company website
            </label>
            <input
              id="website"
              name="website"
              type="url"
              defaultValue={editableCompany.website ?? ""}
              placeholder="https://example.com"
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p>
              Public company URL:{" "}
              <Link href={`/jobs/company/${editableCompany.slug}`} className="underline">
                /jobs/company/{editableCompany.slug}
              </Link>
            </p>
            <p className="mt-1">The company slug stays fixed so existing links do not break.</p>
          </div>

          <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
            Save company
          </button>
        </form>
      )}
    </section>
  )
}
