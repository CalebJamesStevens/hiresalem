import { and, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { isJobPublished } from "@/lib/job-listing-billing"
import { companies } from "@repo/db/schema/companies"
import { jobs } from "@repo/db/schema/jobs"
import { savedJobs, type savedJobAlertStateEnum } from "@repo/db/schema/saved-jobs"

export type SavedJob = typeof savedJobs.$inferSelect
export type SavedJobAlertState = (typeof savedJobAlertStateEnum.enumValues)[number]
type JobRecord = typeof jobs.$inferSelect

export type SavedJobListing = {
  id: string
  userAuthId: string
  recipientEmail: string
  jobId: string
  alertsEnabled: boolean
  lastAlertedState: SavedJobAlertState | null
  createdAt: Date
  jobSlug: string
  jobTitle: string
  jobLocation: string | null
  jobCompanyName: string | null
  jobCompanySlug: string | null
  jobCreatedAt: Date
  jobActivatedAt: Date | null
  jobIsActive: boolean
  jobPaymentStatus: JobRecord["paymentStatus"]
  jobExpiresAt: Date | null
}

function toAlertState(job: Pick<JobRecord, "isActive" | "paymentStatus" | "expiresAt" | "activatedAt">): SavedJobAlertState {
  return isJobPublished(job) ? "live" : "closed"
}

export function getSavedJobAlertState(job: Pick<JobRecord, "isActive" | "paymentStatus" | "expiresAt" | "activatedAt">) {
  return toAlertState(job)
}

export async function listSavedJobIdsForUser(userAuthId: string) {
  const rows = await db.select({ jobId: savedJobs.jobId }).from(savedJobs).where(eq(savedJobs.userAuthId, userAuthId))
  return rows.map((row) => row.jobId)
}

export async function listSavedJobsForUser(userAuthId: string): Promise<SavedJobListing[]> {
  return db
    .select({
      id: savedJobs.id,
      userAuthId: savedJobs.userAuthId,
      recipientEmail: savedJobs.recipientEmail,
      jobId: savedJobs.jobId,
      alertsEnabled: savedJobs.alertsEnabled,
      lastAlertedState: savedJobs.lastAlertedState,
      createdAt: savedJobs.createdAt,
      jobSlug: jobs.slug,
      jobTitle: jobs.title,
      jobLocation: jobs.location,
      jobCompanyName: companies.name,
      jobCompanySlug: companies.slug,
      jobCreatedAt: jobs.createdAt,
      jobActivatedAt: jobs.activatedAt,
      jobIsActive: jobs.isActive,
      jobPaymentStatus: jobs.paymentStatus,
      jobExpiresAt: jobs.expiresAt
    })
    .from(savedJobs)
    .innerJoin(jobs, eq(savedJobs.jobId, jobs.id))
    .leftJoin(companies, eq(jobs.companyId, companies.id))
    .where(eq(savedJobs.userAuthId, userAuthId))
    .orderBy(desc(savedJobs.createdAt))
}

export async function getSavedJob(userAuthId: string, jobId: string) {
  const [savedJob] = await db
    .select()
    .from(savedJobs)
    .where(and(eq(savedJobs.userAuthId, userAuthId), eq(savedJobs.jobId, jobId)))
    .limit(1)

  return savedJob ?? null
}

export async function createSavedJob(input: { userAuthId: string; recipientEmail: string; jobId: string }) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, input.jobId)).limit(1)
  if (!job) {
    throw new Error("job_not_found")
  }

  const [existing] = await db
    .select()
    .from(savedJobs)
    .where(and(eq(savedJobs.userAuthId, input.userAuthId), eq(savedJobs.jobId, input.jobId)))
    .limit(1)

  if (existing) {
    return existing
  }

  const [created] = await db
    .insert(savedJobs)
    .values({
      userAuthId: input.userAuthId,
      recipientEmail: input.recipientEmail.trim().toLowerCase(),
      jobId: input.jobId,
      alertsEnabled: true,
      lastAlertedState: toAlertState(job)
    })
    .returning()

  return created
}

export async function deleteSavedJob(input: { userAuthId: string; jobId: string }) {
  const [deleted] = await db
    .delete(savedJobs)
    .where(and(eq(savedJobs.userAuthId, input.userAuthId), eq(savedJobs.jobId, input.jobId)))
    .returning()

  return deleted ?? null
}

export async function updateSavedJobAlerts(input: { userAuthId: string; jobId: string; alertsEnabled: boolean; recipientEmail?: string | null }) {
  const [updated] = await db
    .update(savedJobs)
    .set({
      alertsEnabled: input.alertsEnabled,
      recipientEmail: input.recipientEmail?.trim().toLowerCase() || undefined
    })
    .where(and(eq(savedJobs.userAuthId, input.userAuthId), eq(savedJobs.jobId, input.jobId)))
    .returning()

  return updated ?? null
}

export async function listSavedJobsReadyForAlerts() {
  const rows = await db
    .select({
      id: savedJobs.id,
      userAuthId: savedJobs.userAuthId,
      recipientEmail: savedJobs.recipientEmail,
      jobId: savedJobs.jobId,
      alertsEnabled: savedJobs.alertsEnabled,
      lastAlertedState: savedJobs.lastAlertedState,
      createdAt: savedJobs.createdAt,
      jobSlug: jobs.slug,
      jobTitle: jobs.title,
      jobLocation: jobs.location,
      jobCompanyName: companies.name,
      jobCompanySlug: companies.slug,
      jobCreatedAt: jobs.createdAt,
      jobActivatedAt: jobs.activatedAt,
      jobIsActive: jobs.isActive,
      jobPaymentStatus: jobs.paymentStatus,
      jobExpiresAt: jobs.expiresAt
    })
    .from(savedJobs)
    .innerJoin(jobs, eq(savedJobs.jobId, jobs.id))
    .leftJoin(companies, eq(jobs.companyId, companies.id))
    .where(eq(savedJobs.alertsEnabled, true))

  return rows
    .map((row) => ({
      ...row,
      currentState: toAlertState({
        isActive: row.jobIsActive,
        paymentStatus: row.jobPaymentStatus,
        expiresAt: row.jobExpiresAt,
        activatedAt: row.jobActivatedAt
      })
    }))
    .filter((row) => row.lastAlertedState !== row.currentState)
}

export async function markSavedJobsAlertState(updates: Array<{ id: string; state: SavedJobAlertState }>) {
  if (updates.length === 0) {
    return
  }

  await Promise.all(
    updates.map((update) =>
      db.update(savedJobs).set({ lastAlertedState: update.state }).where(eq(savedJobs.id, update.id))
    )
  )
}
