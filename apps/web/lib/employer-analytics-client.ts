"use client"

type EmployerAnalyticsEventInput = {
  companyId: string
  jobId?: string
  eventType: "job_view" | "apply_click" | "company_view"
  sessionKey?: string
}

function buildSessionKey(baseKey: string) {
  if (typeof window === "undefined") {
    return baseKey
  }

  const existing = window.sessionStorage.getItem(baseKey)
  if (existing) {
    return existing
  }

  const created = `${baseKey}:${Date.now().toString(36)}`
  window.sessionStorage.setItem(baseKey, created)
  return created
}

export function getEmployerAnalyticsSessionKey(scope: string, id: string) {
  return buildSessionKey(`employer-analytics:${scope}:${id}`)
}

export function trackEmployerAnalyticsEvent(input: EmployerAnalyticsEventInput) {
  const payload = JSON.stringify(input)

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([payload], {
      type: "application/json"
    })

    navigator.sendBeacon("/api/employer-analytics/events", blob)
    return
  }

  void fetch("/api/employer-analytics/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: payload,
    keepalive: true
  })
}
