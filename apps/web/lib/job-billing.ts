import { and, eq, isNotNull, lte } from "drizzle-orm"

import { db } from "@/lib/db"
import { syncGoogleIndexingForJobTransition } from "@/lib/job-indexing"
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

  const nextJob = updated ?? job
  await syncGoogleIndexingForJobTransition({
    before: job,
    after: nextJob
  })

  return nextJob
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

export async function expirePublishedJobListings(now = new Date()) {
  const expiredJobs = await db
    .update(jobs)
    .set({
      isActive: false,
      paymentStatus: "expired"
    })
    .where(and(eq(jobs.isActive, true), eq(jobs.paymentStatus, "paid"), isNotNull(jobs.expiresAt), lte(jobs.expiresAt, now)))
    .returning({
      slug: jobs.slug,
      isActive: jobs.isActive,
      paymentStatus: jobs.paymentStatus,
      expiresAt: jobs.expiresAt
    })

  for (const job of expiredJobs) {
    await syncGoogleIndexingForJobTransition({
      before: {
        ...job,
        isActive: true,
        paymentStatus: "paid"
      },
      after: job
    })
  }

  return {
    expiredCount: expiredJobs.length
  }
}
