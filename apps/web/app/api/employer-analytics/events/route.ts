import { checkRateLimit } from "@/lib/rate-limit"
import { getRequestKey } from "@/lib/request"
import { parseEmployerAnalyticsEvent, recordEmployerAnalyticsEvent, validateEmployerAnalyticsTarget } from "@/lib/employer-analytics"

export async function POST(request: Request) {
  const rate = checkRateLimit("employer-analytics:event", getRequestKey(request), 120, 60 * 1000)
  if (!rate.ok) {
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  const parsed = parseEmployerAnalyticsEvent(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 })
  }

  const isValidTarget = await validateEmployerAnalyticsTarget(parsed.data)
  if (!isValidTarget) {
    return Response.json({ error: "Invalid analytics target" }, { status: 400 })
  }

  await recordEmployerAnalyticsEvent(parsed.data)

  return Response.json({ ok: true }, { status: 201 })
}
