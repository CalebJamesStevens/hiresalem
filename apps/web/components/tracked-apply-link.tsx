"use client"

import { trackAnalyticsEvent } from "@/lib/analytics"
import { getEmployerAnalyticsSessionKey, trackEmployerAnalyticsEvent } from "@/lib/employer-analytics-client"

type TrackedApplyLinkProps = {
  href: string
  className?: string
  children: React.ReactNode
  companyId?: string | null
  jobId?: string | null
}

export function TrackedApplyLink({ href, className, children, companyId, jobId }: TrackedApplyLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        trackAnalyticsEvent("apply_click")

        if (companyId && jobId) {
          trackEmployerAnalyticsEvent({
            companyId,
            jobId,
            eventType: "apply_click",
            sessionKey: getEmployerAnalyticsSessionKey("apply_click", jobId)
          })
        }
      }}
      className={className}
    >
      {children}
    </a>
  )
}
