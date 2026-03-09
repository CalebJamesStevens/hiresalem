import { absoluteUrl } from "@/lib/seo"
import { publishGoogleIndexingNotification } from "@/lib/google-indexing"
import { isJobPublished, type JobPaymentStatus } from "@/lib/job-listing-billing"

export type JobIndexingRecord = {
  slug: string
  isActive: boolean
  paymentStatus: JobPaymentStatus
  expiresAt: Date | null
}

export function getGoogleIndexingNotificationTypeForJobTransition(input: {
  before: JobIndexingRecord | null
  after: JobIndexingRecord | null
}) {
  const wasPublished = input.before ? isJobPublished(input.before) : false
  const isPublishedNow = input.after ? isJobPublished(input.after) : false

  if (!wasPublished && isPublishedNow) {
    return "URL_UPDATED" as const
  }

  if (wasPublished && !isPublishedNow) {
    return "URL_DELETED" as const
  }

  return null
}

export async function syncGoogleIndexingForJobTransition(input: {
  before: JobIndexingRecord | null
  after: JobIndexingRecord | null
}) {
  const notificationType = getGoogleIndexingNotificationTypeForJobTransition(input)
  const targetJob = input.after ?? input.before

  if (!notificationType || !targetJob) {
    return { ok: true as const, skipped: true as const }
  }

  try {
    return await publishGoogleIndexingNotification({
      url: absoluteUrl(`/jobs/${targetJob.slug}`),
      type: notificationType
    })
  } catch (error) {
    console.error("Google indexing notification failed", targetJob.slug, notificationType, error)
    return { ok: false as const, skipped: false as const }
  }
}

