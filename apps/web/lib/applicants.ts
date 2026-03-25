import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/lib/db"
import type { ApplicantInboxParams, ApplicationStage } from "@/lib/applicant-inbox"
import { applyTypeEnum, type jobPaymentStatusEnum } from "@repo/db/schema/jobs"
import { applications } from "@repo/db/schema/applications"
import { jobs } from "@repo/db/schema/jobs"

export type EmployerViewer = {
  id: string
  isAdmin: boolean
}

export type EmployerApplicantJob = {
  id: string
  slug: string
  title: string
  location: string | null
  applyType: (typeof applyTypeEnum.enumValues)[number]
  isFeatured: boolean
  isActive: boolean
  paymentStatus: (typeof jobPaymentStatusEnum.enumValues)[number]
  activatedAt: Date | null
  featuredExpiresAt: Date | null
  expiresAt: Date | null
  applicationCount: number
}

export type EmployerApplication = {
  id: string
  jobId: string
  name: string
  email: string
  phone: string | null
  location: string | null
  resume: string | null
  linkedinUrl: string | null
  portfolioUrl: string | null
  coverLetter: string | null
  stage: ApplicationStage
  stageUpdatedAt: Date
  updatedAt: Date
  internalNotes: string | null
  nextStepAt: Date | null
  nextStepNote: string | null
  lastContactedAt: Date | null
  createdAt: Date
  jobTitle: string
  jobSlug: string
  jobIsActive: boolean
}

type EmployerWorkflowPatch = {
  stage?: ApplicationStage
  internalNotes?: string | null
  nextStepAt?: Date | null
  nextStepNote?: string | null
  lastContactedAt?: Date | null
}

const optionalTextField = (max: number) =>
  z
    .union([z.string().max(max), z.null()])
    .transform((value) => {
      if (value === null) {
        return null
      }

      const trimmed = value.trim()
      return trimmed ? trimmed : null
    })
    .optional()

const optionalDateField = z
  .union([z.string().datetime({ offset: true }), z.null()])
  .transform((value) => {
    if (value === null) {
      return null
    }

    return new Date(value)
  })
  .optional()

const employerWorkflowPatchSchema = z
  .object({
    stage: z.enum(["new", "reviewed", "interviewing", "offer", "rejected"]).optional(),
    internalNotes: optionalTextField(5000),
    nextStepAt: optionalDateField,
    nextStepNote: optionalTextField(1000),
    lastContactedAt: optionalDateField
  })
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one workflow field is required."
      })
    }
  })

export function parseEmployerWorkflowPatch(input: unknown) {
  return employerWorkflowPatchSchema.safeParse(input)
}

export function canManageEmployerApplication(viewer: EmployerViewer, ownerAuthId: string) {
  return viewer.isAdmin || viewer.id === ownerAuthId
}

export function getEmployerApplicationStageCounts(rows: Array<Pick<EmployerApplication, "stage">>) {
  return rows.reduce<Record<ApplicationStage, number>>(
    (counts, row) => {
      counts[row.stage] += 1
      return counts
    },
    {
      new: 0,
      reviewed: 0,
      interviewing: 0,
      offer: 0,
      rejected: 0
    }
  )
}

export async function listEmployerApplicantJobs(viewer: EmployerViewer) {
  const countExpression = sql<number>`count(${applications.id})::int`
  const query = db
    .select({
      id: jobs.id,
      slug: jobs.slug,
      title: jobs.title,
      location: jobs.location,
      applyType: jobs.applyType,
      isFeatured: jobs.isFeatured,
      isActive: jobs.isActive,
      paymentStatus: jobs.paymentStatus,
      activatedAt: jobs.activatedAt,
      featuredExpiresAt: jobs.featuredExpiresAt,
      expiresAt: jobs.expiresAt,
      applicationCount: countExpression
    })
    .from(jobs)
    .leftJoin(applications, eq(applications.jobId, jobs.id))
    .groupBy(
      jobs.id,
      jobs.slug,
      jobs.title,
      jobs.location,
      jobs.applyType,
      jobs.isActive,
      jobs.paymentStatus,
      jobs.activatedAt,
      jobs.featuredExpiresAt,
      jobs.expiresAt,
      jobs.createdAt
    )
    .orderBy(desc(jobs.createdAt))

  return viewer.isAdmin ? await query : await query.where(eq(jobs.ownerAuthId, viewer.id))
}

export async function listEmployerApplications(viewer: EmployerViewer, filters: ApplicantInboxParams) {
  const predicates: SQL[] = []

  if (!viewer.isAdmin) {
    predicates.push(eq(jobs.ownerAuthId, viewer.id))
  }

  if (filters.jobId) {
    predicates.push(eq(applications.jobId, filters.jobId))
  }

  if (filters.stage !== "any") {
    predicates.push(eq(applications.stage, filters.stage))
  }

  if (filters.q) {
    const pattern = `%${filters.q}%`
    predicates.push(or(ilike(applications.name, pattern), ilike(applications.email, pattern)) as SQL)
  }

  const where = predicates.length > 0 ? and(...predicates) : undefined

  const query = db
    .select({
      id: applications.id,
      jobId: applications.jobId,
      name: applications.name,
      email: applications.email,
      phone: applications.phone,
      location: applications.location,
      resume: applications.resume,
      linkedinUrl: applications.linkedinUrl,
      portfolioUrl: applications.portfolioUrl,
      coverLetter: applications.coverLetter,
      stage: applications.stage,
      stageUpdatedAt: applications.stageUpdatedAt,
      updatedAt: applications.updatedAt,
      internalNotes: applications.internalNotes,
      nextStepAt: applications.nextStepAt,
      nextStepNote: applications.nextStepNote,
      lastContactedAt: applications.lastContactedAt,
      createdAt: applications.createdAt,
      jobTitle: jobs.title,
      jobSlug: jobs.slug,
      jobIsActive: jobs.isActive
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .orderBy(desc(applications.createdAt))

  return where ? await query.where(where) : await query
}

export async function getEmployerApplicationOwner(applicationId: string) {
  const [row] = await db
    .select({
      id: applications.id,
      stage: applications.stage,
      ownerAuthId: jobs.ownerAuthId
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(eq(applications.id, applicationId))
    .limit(1)

  return row ?? null
}

export function buildEmployerWorkflowUpdate(
  existingStage: ApplicationStage,
  patch: EmployerWorkflowPatch
): Partial<typeof applications.$inferInsert> {
  const now = new Date()
  const update: Partial<typeof applications.$inferInsert> = {
    updatedAt: now
  }

  if ("stage" in patch && patch.stage) {
    update.stage = patch.stage

    if (patch.stage !== existingStage) {
      update.stageUpdatedAt = now
    }
  }

  if ("internalNotes" in patch) {
    update.internalNotes = patch.internalNotes ?? null
  }

  if ("nextStepAt" in patch) {
    update.nextStepAt = patch.nextStepAt ?? null
  }

  if ("nextStepNote" in patch) {
    update.nextStepNote = patch.nextStepNote ?? null
  }

  if ("lastContactedAt" in patch) {
    update.lastContactedAt = patch.lastContactedAt ?? null
  }

  return update
}
