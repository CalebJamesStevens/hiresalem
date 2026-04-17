declare global {
  interface Window {
    goatcounter?: {
      count: (input: {
        path?: string
        title?: string
        event?: boolean
      }) => void
    }
    fbq?: (...args: unknown[]) => void
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

export function getMetaPixelBootstrapCode(pixelId: string) {
  const serializedPixelId = JSON.stringify(pixelId.trim())

  return `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');fbq('init', ${serializedPixelId});fbq('track', 'PageView');`
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

export function trackMetaPixelEvent(eventName: string) {
  if (typeof window === "undefined") {
    return
  }

  window.fbq?.("track", eventName)
}
