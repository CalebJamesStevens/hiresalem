import Link from "next/link"

import { getLockedCompanyFeatureMessage, MANUAL_UPGRADE_NOTE, type LockedCompanyFeatureId } from "@/lib/company-plan-ui"
import type { ResolvedCompanyPlan } from "@repo/db/plans"

export function LockedPlanFeatureCard({
  plan,
  featureId,
  href = "/dashboard/plan"
}: {
  plan: ResolvedCompanyPlan
  featureId: LockedCompanyFeatureId
  href?: string
}) {
  const feature = getLockedCompanyFeatureMessage(plan, featureId)

  if (!feature) {
    return null
  }

  return (
    <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Upgrade available</p>
      <h3 className="mt-2 text-base font-semibold text-amber-950">{feature.label}</h3>
      <p className="mt-2">{feature.description}</p>
      <p className="mt-3 font-medium text-amber-900">{feature.availabilityLabel}</p>
      <p className="mt-2 text-amber-800">{MANUAL_UPGRADE_NOTE}</p>
      <Link href={href} className="mt-3 inline-flex text-sm font-medium underline underline-offset-4">
        View plan details
      </Link>
    </article>
  )
}
