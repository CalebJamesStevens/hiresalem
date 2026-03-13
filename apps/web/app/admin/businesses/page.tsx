import { EmployerPlanSummaryCard } from "@/components/employer-plan-summary-card"
import { listPendingCompanyClaimRequests } from "@/lib/company-claims"
import { getCompanyById, listCompanies } from "@/lib/companies"
import { requirePageRoles } from "@/lib/page-auth"
import { companyPlanIds, getCompanyPlanLabel, resolveCompanyPlan } from "@repo/db/plans"

type AdminBusinessesPageProps = {
  searchParams: Promise<{
    companyId?: string
    updated?: string
    error?: string
    claimUpdated?: string
    claimError?: string
  }>
}

function getErrorMessage(error?: string) {
  if (error === "invalid_company_plan") {
    return "Select a valid business plan."
  }

  if (error === "plan_override_reason_length") {
    return "Internal note must be 500 characters or fewer."
  }

  if (error === "invalid_company_plan_update") {
    return "Unable to update the business plan. Check the fields and try again."
  }

  if (error === "claim_not_found") {
    return "Claim request not found."
  }

  if (error === "claim_not_pending") {
    return "This claim request has already been reviewed."
  }

  if (error === "already_claimed") {
    return "That company has already been claimed."
  }

  if (error === "requester_already_has_company") {
    return "That requester already manages another company."
  }

  if (error === "invalid_claim_action") {
    return "Choose a valid claim review action."
  }

  if (
    error === "admin_config_missing" ||
    error === "admin_unreachable" ||
    error === "realm_not_found" ||
    error === "admin_auth_failed" ||
    error === "service_account_disabled" ||
    error === "admin_forbidden" ||
    error === "role_missing" ||
    error === "role_assign_failed"
  ) {
    return "Unable to grant the business role while approving this claim."
  }

  return null
}

export const dynamic = "force-dynamic"

export default async function AdminBusinessesPage({ searchParams }: AdminBusinessesPageProps) {
  const params = await searchParams
  await requirePageRoles(["admin"], "/admin/businesses")

  const [companyOptions, pendingClaims] = await Promise.all([listCompanies(), listPendingCompanyClaimRequests()])
  const selectedCompanyId = params.companyId?.trim() || companyOptions[0]?.id || null
  const company = selectedCompanyId ? await getCompanyById(selectedCompanyId) : null
  const resolvedPlan = company ? resolveCompanyPlan(company) : null
  const errorMessage = getErrorMessage(params.error ?? params.claimError)

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Business plans</h1>
        <p className="text-slate-600">Manage manual plan assignments, chamber trials, and override notes on top of the live self-serve billing flow.</p>
      </div>

      {params.updated === "1" ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Business plan updated.</p>
      ) : null}

      {params.claimUpdated === "1" ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Claim request updated.</p>
      ) : null}

      {errorMessage ? <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}

      <section className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-950">Pending claims</h2>
          <p className="text-sm text-slate-600">Review businesses waiting for ownership approval.</p>
        </div>
        {pendingClaims.length === 0 ? <p className="text-sm text-slate-600">No pending company claims.</p> : null}
        {pendingClaims.map((claim) => (
          <article key={claim.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="space-y-2">
              <p className="font-medium text-slate-900">
                {claim.companyName} (/jobs/company/{claim.companySlug})
              </p>
              <p className="text-sm text-slate-600">
                Requester: {claim.requesterAuthId} • {claim.contactEmail}
              </p>
              <p className="text-sm text-slate-600">Submitted: {claim.createdAt.toLocaleDateString()}</p>
              {claim.message ? <p className="text-sm text-slate-700">{claim.message}</p> : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <form action={`/api/admin/company-claims/${claim.id}`} method="post" className="flex flex-wrap gap-3">
                <input type="hidden" name="returnTo" value="/admin/businesses" />
                <input type="hidden" name="action" value="approve" />
                <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
                  Approve claim
                </button>
              </form>
              <form action={`/api/admin/company-claims/${claim.id}`} method="post" className="flex flex-wrap gap-3">
                <input type="hidden" name="returnTo" value="/admin/businesses" />
                <input type="hidden" name="action" value="reject" />
                <input
                  type="text"
                  name="rejectionReason"
                  placeholder="Optional rejection reason"
                  className="rounded border px-3 py-2 text-sm"
                />
                <button type="submit" className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700">
                  Reject claim
                </button>
              </form>
            </div>
          </article>
        ))}
      </section>

      <form action="/admin/businesses" className="rounded-2xl border bg-white p-4 shadow-sm">
        <label htmlFor="companyId" className="block text-sm font-medium text-slate-900">
          Select company
        </label>
        <div className="mt-2 flex flex-wrap gap-3">
          <select id="companyId" name="companyId" defaultValue={selectedCompanyId ?? ""} className="min-w-[18rem] rounded border px-3 py-2">
            {companyOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} ({option.slug}) - {resolveCompanyPlan(option).label}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
            Load company
          </button>
        </div>
      </form>

      {!company || !resolvedPlan ? (
        <p className="rounded border bg-white px-4 py-3 text-sm text-slate-600">No company selected yet.</p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <form action={`/api/admin/companies/${company.id}/plan`} method="post" className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
              <input type="hidden" name="returnTo" value={`/admin/businesses?companyId=${company.id}`} />

              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-950">{company.name}</h2>
                <p className="text-sm text-slate-600">
                  /jobs/company/{company.slug} • owner {company.ownerAuthId}
                </p>
                <p className="text-sm text-slate-600">Last plan update: {company.planAssignedAt.toLocaleDateString()}</p>
                {company.planOverrideReason ? <p className="text-sm text-slate-600">Current internal note: {company.planOverrideReason}</p> : null}
              </div>

              <div className="space-y-1">
                <label htmlFor="plan" className="text-sm font-medium text-slate-900">
                  Base plan
                </label>
                <select id="plan" name="plan" defaultValue={company.plan} className="w-full rounded border px-3 py-2">
                  {companyPlanIds.map((planId) => (
                    <option key={planId} value={planId}>
                      {getCompanyPlanLabel(planId)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="planOverride" className="text-sm font-medium text-slate-900">
                  Manual override
                </label>
                <select id="planOverride" name="planOverride" defaultValue={company.planOverride ?? ""} className="w-full rounded border px-3 py-2">
                  <option value="">No override</option>
                  {companyPlanIds.map((planId) => (
                    <option key={planId} value={planId}>
                      {getCompanyPlanLabel(planId)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">Use overrides for chamber pilots, one-off trials, or temporary manual entitlements.</p>
              </div>

              <div className="space-y-1">
                <label htmlFor="planOverrideReason" className="text-sm font-medium text-slate-900">
                  Internal note
                </label>
                <textarea
                  id="planOverrideReason"
                  name="planOverrideReason"
                  rows={4}
                  defaultValue={company.planOverrideReason ?? ""}
                  placeholder="Chamber pilot, founder comp, manual featured-job trial, etc."
                  className="w-full rounded border px-3 py-2"
                />
              </div>

              <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
                Save business plan
              </button>
            </form>

            <EmployerPlanSummaryCard plan={resolvedPlan} title="Effective plan" showAssignmentDetails />
          </div>
        </>
      )}
    </section>
  )
}
