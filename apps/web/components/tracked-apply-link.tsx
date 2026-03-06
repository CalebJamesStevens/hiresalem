"use client"

import { trackAnalyticsEvent } from "@/lib/analytics"

type TrackedApplyLinkProps = {
  href: string
  className?: string
  children: React.ReactNode
}

export function TrackedApplyLink({ href, className, children }: TrackedApplyLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        trackAnalyticsEvent("apply_click")
      }}
      className={className}
    >
      {children}
    </a>
  )
}
