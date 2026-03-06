type RateLimitEntry = {
  count: number
  expiresAt: number
}

type RateLimitStore = Map<string, RateLimitEntry>

declare global {
  var __hiresalemRateLimits: RateLimitStore | undefined
}

const store = globalThis.__hiresalemRateLimits ?? new Map<string, RateLimitEntry>()
globalThis.__hiresalemRateLimits = store

export function checkRateLimit(namespace: string, key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const bucketKey = `${namespace}:${key}`
  const entry = store.get(bucketKey)

  if (!entry || entry.expiresAt <= now) {
    store.set(bucketKey, { count: 1, expiresAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfterSeconds: Math.ceil(windowMs / 1000) }
  }

  if (entry.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.expiresAt - now) / 1000))
    return { ok: false, remaining: 0, retryAfterSeconds }
  }

  entry.count += 1
  store.set(bucketKey, entry)

  return { ok: true, remaining: Math.max(0, limit - entry.count), retryAfterSeconds: Math.ceil((entry.expiresAt - now) / 1000) }
}
