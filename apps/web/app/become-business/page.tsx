import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"

import { unstable_update } from "@/auth"
import { createUniqueCompanySlug, getCompanyByOwnerAuthId } from "@/lib/companies"
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
    return "Company name must be at least 2 characters."
  }

  if (error === "invalid_website") {
    return "Website must be a valid URL."
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

function normalizeWebsite(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  try {
    const url = new URL(trimmed)
    return url.toString()
  } catch {
    return null
  }
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
          Create your company profile and unlock job posting from the same account you already use on HireSalem.
        </p>
      </div>

      {message ? <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}

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

          const name = String(formData.get("name") ?? "").trim()
          const websiteInput = String(formData.get("website") ?? "")

          if (name.length < 2) {
            redirect("/become-business?error=company_name_length")
          }

          const website = normalizeWebsite(websiteInput)
          if (websiteInput.trim() && !website) {
            redirect("/become-business?error=invalid_website")
          }

          const existingCompany = await getCompanyByOwnerAuthId(userId)
          let companyId = existingCompany?.id ?? null
          const shouldDeleteCreatedCompany = !existingCompany

          if (!companyId) {
            const slug = await createUniqueCompanySlug(name)

            try {
              const [createdCompany] = await db
                .insert(companies)
                .values({
                  name,
                  slug,
                  ownerAuthId: userId,
                  website
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

          redirect("/dashboard/jobs?upgraded=1")
        }}
        className="space-y-4 rounded-lg border bg-white p-6"
      >
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            Company name
          </label>
          <input id="name" name="name" required className="w-full rounded border px-3 py-2" />
        </div>

        <div className="space-y-1">
          <label htmlFor="website" className="text-sm font-medium">
            Company website
          </label>
          <input id="website" name="website" type="url" placeholder="https://example.com" className="w-full rounded border px-3 py-2" />
        </div>

        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
          Upgrade to business
        </button>
      </form>
    </section>
  )
}
