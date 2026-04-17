"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { trackAnalyticsEvent, trackMetaPixelEvent } from "@/lib/analytics"

export function AnalyticsListener() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const trackedGoatCounterEvent = searchParams.get("_gc_event")
    const trackedMetaPixelEvent = searchParams.get("_fb_event")

    if (!trackedGoatCounterEvent && !trackedMetaPixelEvent) {
      return
    }

    if (trackedGoatCounterEvent) {
      trackAnalyticsEvent(trackedGoatCounterEvent)
    }

    if (trackedMetaPixelEvent) {
      trackMetaPixelEvent(trackedMetaPixelEvent)
    }

    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.delete("_gc_event")
    nextUrl.searchParams.delete("_fb_event")
    window.history.replaceState({}, "", `${pathname}${nextUrl.search}${nextUrl.hash}`)
  }, [pathname, searchParams])

  return null
}
