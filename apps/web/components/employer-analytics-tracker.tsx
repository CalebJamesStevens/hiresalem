"use client"

import { useEffect } from "react"

import { getEmployerAnalyticsSessionKey, trackEmployerAnalyticsEvent } from "@/lib/employer-analytics-client"

type EmployerAnalyticsTrackerProps = {
  companyId: string
  jobId?: string
  eventType: "job_view" | "company_view"
  entityKey: string
}

export function EmployerAnalyticsTracker({ companyId, jobId, eventType, entityKey }: EmployerAnalyticsTrackerProps) {
  useEffect(() => {
    const storageKey = `employer-analytics:tracked:${eventType}:${entityKey}`

    if (window.sessionStorage.getItem(storageKey)) {
      return
    }

    window.sessionStorage.setItem(storageKey, "1")

    trackEmployerAnalyticsEvent({
      companyId,
      jobId,
      eventType,
      sessionKey: getEmployerAnalyticsSessionKey(eventType, entityKey)
    })
  }, [companyId, entityKey, eventType, jobId])

  return null
}
