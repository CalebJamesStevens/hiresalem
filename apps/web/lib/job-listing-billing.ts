import { and, eq, gt, isNull, or } from "drizzle-orm"

import { jobs, type jobPaymentStatusEnum } from "@repo/db/schema/jobs"

export const JOB_LISTING_PRICE_PER_DAY_CENTS = 500
export const JOB_LISTING_MIN_DAYS = 1
export const JOB_LISTING_MAX_DAYS = 90
export const JOB_LISTING_DEFAULT_DAYS = 30
export const JOB_UNAVAILABLE_RETENTION_DAYS = 21

const DAY_IN_MS = 24 * 60 * 60 * 1000

export type JobPaymentStatus = (typeof jobPaymentStatusEnum.enumValues)[number]

type JobPublicationFields = {
  isActive: boolean
  paymentStatus: JobPaymentStatus
  expiresAt: Date | null
}

export function calculateJobListingPrice(days: number) {
  return JOB_LISTING_PRICE_PER_DAY_CENTS * days
}

export function formatJobListingPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100)
}

export function isJobPublished(job: JobPublicationFields, now = new Date()) {
  if (!job.isActive || job.paymentStatus !== "paid") {
    return false
  }

  if (!job.expiresAt) {
    return true
  }

  return job.expiresAt.getTime() > now.getTime()
}

export function isJobExpired(job: Pick<JobPublicationFields, "paymentStatus" | "expiresAt">, now = new Date()) {
  if (job.paymentStatus === "expired") {
    return true
  }

  return Boolean(job.expiresAt && job.expiresAt.getTime() <= now.getTime())
}

export function getJobStatusLabel(job: JobPublicationFields, now = new Date()) {
  if (job.paymentStatus === "pending") {
    return "Pending payment"
  }

  if (job.paymentStatus === "canceled") {
    return "Payment canceled"
  }

  if (isJobExpired(job, now)) {
    return "Expired"
  }

  if (!job.isActive) {
    return "Closed"
  }

  return "Active"
}

export function getPublishedJobsFilter(now = new Date()) {
  return and(eq(jobs.isActive, true), eq(jobs.paymentStatus, "paid"), or(isNull(jobs.expiresAt), gt(jobs.expiresAt, now)))!
}

type HistoricalJobFields = JobPublicationFields & {
  activatedAt?: Date | null
  createdAt: Date
}

export function wasJobEverPublished(job: HistoricalJobFields) {
  return Boolean(job.activatedAt) || job.paymentStatus === "expired"
}

export function getUnavailableJobRetentionEndsAt(job: HistoricalJobFields) {
  const unavailableSince = job.expiresAt ?? job.activatedAt ?? job.createdAt
  return new Date(unavailableSince.getTime() + JOB_UNAVAILABLE_RETENTION_DAYS * DAY_IN_MS)
}

export function canServeUnavailableJobPage(job: HistoricalJobFields, now = new Date()) {
  if (!wasJobEverPublished(job)) {
    return false
  }

  return getUnavailableJobRetentionEndsAt(job).getTime() > now.getTime()
}
