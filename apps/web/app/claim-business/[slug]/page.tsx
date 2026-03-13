import Link from "next/link"
import { redirect } from "next/navigation"

import { createCompanyClaimRequest, parseCompanyClaimInput } from "@/lib/company-claims"
import { isCompanyClaimed, getCompanyBySlug } from "@/lib/companies"
import { getSessionSafe } from "@/lib/session"

type ClaimBusinessPageProps = {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    error?: string
    requested?: string
  }>
}

function getErrorMessage(error?: string) {
  if (error === "invalid_contact_email") {
    return "Enter a valid contact email."
  }

  if (error === "already_claimed") {
    return "This business page has already been claimed."
  }

  if (error === "already_business_owner") {
    return "Your account already manages a company."
  }

  if (error === "request_exists") {
    return "You already have a pending claim request for this company."
  }

  if (error === "missing_email") {
    return "Your account needs an email address before you can submit a claim."
  }

  return null
}

export default async function ClaimBusinessPage({ params, searchParams }: ClaimBusinessPageProps) {
  const { slug } = await params
  const query = await searchParams
  const session = await getSessionSafe()
  const userId = session?.user?.id
  const userEmail = typeof session?.user?.email === "string" ? session.user.email : ""
  const company = await getCompanyBySlug(slug)

  if (!company) {
    redirect("/jobs")
  }

  if (!userId) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/claim-business/${slug}`)}`)
  }

  if (isCompanyClaimed(company)) {
    redirect(`/jobs/company/${company.slug}?claimed=1`)
  }

  const errorMessage = getErrorMessage(query.error)

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Claim {company.name}</h1>
        <p className="text-slate-600">Request access to manage this business page and unlock the employer dashboard for this company.</p>
      </div>

      {query.requested === "1" ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Claim request submitted. An admin will review it before ownership changes.
        </p>
      ) : null}

      {errorMessage ? <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}

      <form
        action={async (formData) => {
          "use server"

          const session = await getSessionSafe()
          const userId = session?.user?.id
          const userEmail = typeof session?.user?.email === "string" ? session.user.email : null

          if (!userId) {
            redirect(`/signin?callbackUrl=${encodeURIComponent(`/claim-business/${slug}`)}`)
          }

          if (!userEmail) {
            redirect(`/claim-business/${slug}?error=missing_email`)
          }

          const parsed = parseCompanyClaimInput({
            contactEmail: String(formData.get("contactEmail") ?? ""),
            message: String(formData.get("message") ?? "")
          })

          if (!parsed.success) {
            redirect(`/claim-business/${slug}?error=${parsed.error.issues[0]?.message ?? "invalid_contact_email"}`)
          }

          try {
            await createCompanyClaimRequest({
              companyId: company.id,
              requesterAuthId: userId,
              contactEmail: parsed.data.contactEmail,
              message: parsed.data.message ?? null
            })
          } catch (error) {
            const message = error instanceof Error ? error.message : "request_exists"
            redirect(`/claim-business/${slug}?error=${message}`)
          }

          redirect(`/claim-business/${slug}?requested=1`)
        }}
        className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm"
      >
        <div className="space-y-1">
          <label htmlFor="contactEmail" className="text-sm font-medium text-slate-900">
            Contact email
          </label>
          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            required
            defaultValue={userEmail}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="message" className="text-sm font-medium text-slate-900">
            Why should this claim be approved?
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            placeholder="Share your role at the company, the best website or proof to review, and anything else an admin should know."
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
            Submit claim request
          </button>
          <Link href={`/jobs/company/${company.slug}`} className="rounded border px-4 py-2 text-slate-700">
            Back to company page
          </Link>
        </div>
      </form>
    </section>
  )
}
