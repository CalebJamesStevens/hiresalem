import { getEmployerPlanIncludedHighlights, getEmployerPlanUpgradeHighlights, MANUAL_UPGRADE_NOTE } from "@/lib/company-plan-ui"
import { getCompanyPlanLabel, type ResolvedCompanyPlan } from "@repo/db/plans"

export function EmployerPlanSummaryCard({
  plan,
  title = "Plan summary",
  showAssignmentDetails = false
}: {
  plan: ResolvedCompanyPlan
  title?: string
  showAssignmentDetails?: boolean
}) {
  const includedHighlights = getEmployerPlanIncludedHighlights(plan)
  const upgradeHighlights = getEmployerPlanUpgradeHighlights(plan)

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
        <h2 className="text-2xl font-semibold text-slate-950">{plan.label}</h2>
        {showAssignmentDetails ? (
          <div className="space-y-1 text-sm text-slate-600">
            <p>
              Base plan: <span className="font-medium text-slate-900">{getCompanyPlanLabel(plan.basePlanId)}</span>
            </p>
            {plan.overridePlanId ? (
              <p>
                Manual override: <span className="font-medium text-slate-900">{getCompanyPlanLabel(plan.overridePlanId)}</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Included now</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {includedHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">Upgrade-only capabilities</h3>
          {upgradeHighlights.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">All current employer capabilities are already included on this plan.</p>
          ) : (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
              {upgradeHighlights.map((item) => (
                <li key={item.id}>
                  <span className="font-medium text-slate-900">{item.label}.</span> {item.description} {item.availabilityLabel}.
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm text-slate-600">{MANUAL_UPGRADE_NOTE}</p>
        </div>
      </div>
    </section>
  )
}
