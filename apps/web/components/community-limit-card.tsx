import Link from "next/link"

import { EmployerAddOnCheckoutButton } from "@/components/employer-add-on-checkout-button"
import { COMMUNITY_LIMIT_TITLE, getCommunityLimitBody } from "@/lib/employer-pricing"

export function CommunityLimitCard({ activeListings = 2 }: { activeListings?: number }) {
  return (
    <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">Community plan limit</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-950">{COMMUNITY_LIMIT_TITLE}</h2>
      <p className="mt-3 max-w-3xl leading-6 text-amber-950">{getCommunityLimitBody(activeListings)}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/dashboard/plan#pricing" className="rounded-full bg-slate-900 px-5 py-2.5 font-medium text-white">
          Upgrade Now
        </Link>
        <EmployerAddOnCheckoutButton
          addOnId="extra_slot"
          label="Buy 1 Slot"
          className="rounded-full border border-amber-300 bg-white px-5 py-2.5 font-medium text-slate-900"
        />
      </div>
    </section>
  )
}
