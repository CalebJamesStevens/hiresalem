"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { trackAnalyticsEvent } from "@/lib/analytics"

export function AnalyticsListener() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const trackedEvent = searchParams.get("_gc_event")
    if (!trackedEvent) {
      return
    }

    trackAnalyticsEvent(trackedEvent)

    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.delete("_gc_event")
    window.history.replaceState({}, "", `${pathname}${nextUrl.search}${nextUrl.hash}`)
  }, [pathname, searchParams])

  return null
}
