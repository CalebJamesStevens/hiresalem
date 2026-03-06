declare global {
  interface Window {
    goatcounter?: {
      count: (input: {
        path?: string
        title?: string
        event?: boolean
      }) => void
    }
  }
}

export function getGoatCounterEndpoint(site: string) {
  if (site.startsWith("http://") || site.startsWith("https://")) {
    return site
  }

  return `https://${site}.goatcounter.com/count`
}

export function trackAnalyticsEvent(eventName: string) {
  if (typeof window === "undefined") {
    return
  }

  window.goatcounter?.count({
    path: `/events/${eventName}`,
    title: eventName,
    event: true
  })
}
