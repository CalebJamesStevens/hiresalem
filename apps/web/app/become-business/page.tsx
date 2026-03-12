import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"

import { unstable_update } from "@/auth"
import {
  COMPANY_LOCATION_MAX_LENGTH,
  COMPANY_LOGO_URL_MAX_LENGTH,
  COMPANY_NAME_MAX_LENGTH,
  COMPANY_SHORT_DESCRIPTION_MAX_LENGTH,
  COMPANY_WEBSITE_MAX_LENGTH,
  createUniqueCompanySlug,
  getCompanyByOwnerAuthId,
  getCompanyProfileValidationErrorCode,
  parseCompanyProfileInput,
  updateCompanyProfile
} from "@/lib/companies"
import { hasAnyRole, normalizeRoles } from "@/lib/authz"
import { db } from "@/lib/db"
import { grantRealmRoleToUserInKeycloak } from "@/lib/keycloak"
import { getSessionSafe } from "@/lib/session"
import { companies } from "@repo/db/schema/companies"

type BecomeBusinessPageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

function errorMessage(error: string | undefined) {
  if (!error) {
    return null
  }

  if (error === "company_name_length") {
    return "Business name must be between 2 and 80 characters."
  }

  if (error === "invalid_website") {
    return "Website must be a valid URL."
  }

  if (error === "invalid_logo_url") {
    return "Logo URL must be a valid URL."
  }

  if (error === "short_description_length") {
    return "Short description must be 280 characters or fewer."
  }

  if (error === "company_location_length") {
    return "Location must be 120 characters or fewer."
  }

  if (error === "invalid_company_profile") {
    return "Unable to save the company profile. Check the fields and try again."
  }

  if (error === "already_business") {
    return "This account already has a business profile."
  }

  if (error === "admin_config_missing") {
    return "Business upgrades are not configured yet. Ask support to configure Keycloak admin credentials."
  }

  if (error === "admin_unreachable") {
    return "Business upgrades are temporarily unavailable. Cannot reach authentication service."
  }

  if (error === "realm_not_found") {
    return "Business upgrades are not configured correctly. AUTH_KEYCLOAK_ISSUER points to a realm that does not exist."
  }

  if (error === "admin_auth_failed") {
    return "Business upgrades are temporarily unavailable. Keycloak admin token request failed."
  }

  if (error === "service_account_disabled") {
    return "Business upgrades require Service Accounts enabled on your Keycloak client."
  }

  if (error === "admin_forbidden") {
    return "Business upgrades are blocked: Keycloak client lacks permission to grant roles."
  }

  if (error === "role_missing") {
    return "Business upgrades are temporarily unavailable. The Keycloak realm is missing the business role."
  }

  if (error === "role_assign_failed") {
    return "Unable to grant the business role right now. Please try again."
  }

  return "Unable to upgrade this account. Please try again."
}

export default async function BecomeBusinessPage({ searchParams }: BecomeBusinessPageProps) {
  const params = await searchParams
  const session = await getSessionSafe()
  const userId = session?.user?.id
  const roles = normalizeRoles(session?.user?.roles)

  if (!userId) {
    redirect("/signin?callbackUrl=/become-business")
  }

  if (hasAnyRole(roles, ["business", "admin"])) {
    redirect("/dashboard/jobs")
  }

  const message = errorMessage(params.error)

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Become a business account</h1>
        <p className="max-w-xl text-slate-600">
          Create your Free-plan company profile and unlock job posting from the same account you already use on HireSalem.
        </p>
      </div>

      {message ? <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-medium text-slate-900">Free plan included right now</p>
        <p className="mt-1">Up to 3 active jobs, a basic public company profile, standard visibility, and no paid-placement features yet.</p>
      </div>

      <form
        action={async (formData) => {
          "use server"

          const session = await getSessionSafe()
          const userId = session?.user?.id
          const roles = normalizeRoles(session?.user?.roles)

          if (!userId) {
            redirect("/signin?callbackUrl=/become-business")
          }

          if (hasAnyRole(roles, ["business", "admin"])) {
            redirect("/dashboard/jobs")
          }

          const parsed = parseCompanyProfileInput({
            name: String(formData.get("name") ?? ""),
            logoUrl: String(formData.get("logoUrl") ?? ""),
            shortDescription: String(formData.get("shortDescription") ?? ""),
            website: String(formData.get("website") ?? ""),
            location: String(formData.get("location") ?? "")
          })

          if (!parsed.success) {
            redirect(`/become-business?error=${getCompanyProfileValidationErrorCode(parsed.error)}`)
          }

          const existingCompany = await getCompanyByOwnerAuthId(userId)
          let companyId = existingCompany?.id ?? null
          const shouldDeleteCreatedCompany = !existingCompany

          if (existingCompany) {
            await updateCompanyProfile({
              id: existingCompany.id,
              ...parsed.data
            })
          } else {
            const slug = await createUniqueCompanySlug(parsed.data.name)

            try {
              const [createdCompany] = await db
                .insert(companies)
                .values({
                  ...parsed.data,
                  slug,
                  ownerAuthId: userId
                })
                .returning({ id: companies.id })

              companyId = createdCompany?.id ?? null
            } catch {
              redirect("/become-business?error=already_business")
            }
          }

          if (!companyId) {
            redirect("/become-business")
          }

          const roleResult = await grantRealmRoleToUserInKeycloak({
            userId,
            roleName: "business"
          })

          if (!roleResult.ok) {
            if (shouldDeleteCreatedCompany) {
              await db.delete(companies).where(eq(companies.id, companyId))
            }
            redirect(`/become-business?error=${roleResult.reason}`)
          }

          await unstable_update({
            user: {
              roles: normalizeRoles([...roles, "business"])
            }
          })

          redirect("/dashboard/company?welcome=1")
        }}
        className="space-y-4 rounded-lg border bg-white p-6"
      >
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            Business name
          </label>
          <input id="name" name="name" required maxLength={COMPANY_NAME_MAX_LENGTH} className="w-full rounded border px-3 py-2" />
        </div>

        <div className="space-y-1">
          <label htmlFor="logoUrl" className="text-sm font-medium">
            Logo URL
          </label>
          <input
            id="logoUrl"
            name="logoUrl"
            type="url"
            maxLength={COMPANY_LOGO_URL_MAX_LENGTH}
            placeholder="https://example.com/logo.png"
            className="w-full rounded border px-3 py-2"
          />
          <p className="text-xs text-slate-500">Use a hosted image URL for now. Upload support is out of scope for the Free plan.</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="shortDescription" className="text-sm font-medium">
            Short description
          </label>
          <textarea
            id="shortDescription"
            name="shortDescription"
            rows={4}
            maxLength={COMPANY_SHORT_DESCRIPTION_MAX_LENGTH}
            placeholder="Tell candidates what your business does and the kind of work they would be joining."
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="website" className="text-sm font-medium">
            Company website
          </label>
          <input
            id="website"
            name="website"
            type="url"
            maxLength={COMPANY_WEBSITE_MAX_LENGTH}
            placeholder="https://example.com"
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="location" className="text-sm font-medium">
            City or area
          </label>
          <input
            id="location"
            name="location"
            maxLength={COMPANY_LOCATION_MAX_LENGTH}
            placeholder="Salem, OR"
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
          Start Free business profile
        </button>
      </form>
    </section>
  )
}
