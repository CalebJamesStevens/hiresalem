import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { jobs } from "@repo/db/schema/jobs"

const DAY_IN_MS = 24 * 60 * 60 * 1000

export async function activatePaidJobListing(input: {
  jobId: string
  stripeCheckoutSessionId: string
  stripePaymentIntentId?: string | null
}) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, input.jobId)).limit(1)

  if (!job) {
    return null
  }

  const now = new Date()
  const activatedAt = job.activatedAt ?? now
  const expiresAt = job.expiresAt ?? new Date(activatedAt.getTime() + job.listingDurationDays * DAY_IN_MS)

  const [updated] = await db
    .update(jobs)
    .set({
      isActive: true,
      paymentStatus: "paid",
      activatedAt,
      expiresAt,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      stripePaymentIntentId: input.stripePaymentIntentId ?? job.stripePaymentIntentId
    })
    .where(eq(jobs.id, job.id))
    .returning()

  return updated ?? job
}

export async function markJobPaymentCanceledBySessionId(stripeCheckoutSessionId: string) {
  const [updated] = await db
    .update(jobs)
    .set({
      paymentStatus: "canceled"
    })
    .where(and(eq(jobs.stripeCheckoutSessionId, stripeCheckoutSessionId), eq(jobs.paymentStatus, "pending")))
    .returning()

  return updated ?? null
}
