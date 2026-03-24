export function normalizeCallbackPath(requestUrl: string, candidate: string | null | undefined, fallback = "/") {
  if (!candidate) {
    return fallback
  }

  try {
    const request = new URL(requestUrl)
    const resolved = new URL(candidate, request)

    if (resolved.origin !== request.origin) {
      return fallback
    }

    return `${resolved.pathname}${resolved.search}${resolved.hash}`
  } catch {
    return fallback
  }
}
