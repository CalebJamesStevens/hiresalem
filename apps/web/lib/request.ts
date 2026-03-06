export function getRequestKey(req: Request, userId?: string) {
  if (userId) {
    return `user:${userId}`
  }

  const forwardedFor = req.headers.get("x-forwarded-for")
  const ip = forwardedFor?.split(",")[0]?.trim()

  return ip ? `ip:${ip}` : "ip:unknown"
}
