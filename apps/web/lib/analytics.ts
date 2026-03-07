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

function getGoatCounterBase(site: string) {
  const trimmedSite = site.trim()
  const siteWithProtocol = trimmedSite.startsWith("//")
    ? `https:${trimmedSite}`
    : trimmedSite.startsWith("http://") || trimmedSite.startsWith("https://")
      ? trimmedSite
      : trimmedSite.includes(".") || trimmedSite.includes("/")
        ? `https://${trimmedSite}`
        : `https://${trimmedSite}.goatcounter.com`

  return siteWithProtocol.replace(/\/count(?:\.js)?\/?$/, "")
}

export function getGoatCounterEndpoint(site: string) {
  return `${getGoatCounterBase(site)}/count`
}

export function getGoatCounterScriptSrc(site: string) {
  return `${getGoatCounterBase(site)}/count.js`
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
