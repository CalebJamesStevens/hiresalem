import { eq } from "drizzle-orm"
import { z } from "zod"

import { hasRole, normalizeRoles } from "@/lib/authz"
import { getCompanyById } from "@/lib/companies"
import { FEATURED_JOB_PLAN_MESSAGE, getNextFeaturedAt, validateFeaturedJobRequest } from "@/lib/featured-jobs"
import { getJobStatusLabel, isJobExpired, isJobPublished, JOB_LISTING_DEFAULT_DAYS } from "@/lib/job-listing-billing"
import { countPublishedJobsForCompany } from "@/lib/jobs"
import {
  buildJobWriteValues,
  calculateJobExpiration,
  getJobPublicationValidationMessage,
  getJobPublicationValidationReasons,
  jobWriteSchema,
  resolveCompanyForJob
} from "@/lib/job-write"
import { getSessionSafe } from "@/lib/session"
import { requireApiRoles } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { syncGoogleIndexingForJobTransition } from "@/lib/job-indexing"
import { isWithinCompanyActiveJobLimit, resolveCompanyPlan } from "@repo/db/plans"
import { jobs } from "@repo/db/schema/jobs"

const updateJobSchema = z
  .object({
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional()
  })
  .superRefine((value, ctx) => {
    if (typeof value.isActive !== "boolean" && typeof value.isFeatured !== "boolean") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one job update field is required."
      })
    }
  })

type JobRouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_req: Request, { params }: JobRouteContext) {
  const { id } = await params
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1)

  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 })
  }

  if (isJobPublished(job)) {
    return Response.json(job)
  }

  const session = await getSessionSafe()
  const userId = session?.user?.id
  const roles = normalizeRoles(session?.user?.roles)
  const isAdmin = hasRole(roles, "admin")

  if (!userId || (!isAdmin && job.ownerAuthId !== userId)) {
    return Response.json({ error: "Job not found" }, { status: 404 })
  }

  return Response.json(job)
}

export async function PATCH(req: Request, { params }: JobRouteContext) {
  const authResult = await requireApiRoles(["business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const { id } = await params
  const parsed = updateJobSchema.safeParse(await req.json())

  if (!parsed.success) {
    return Response.json({ error: "Invalid payload" }, { status: 400 })
  }

  const [existing] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1)

  if (!existing) {
    return Response.json({ error: "Job not found" }, { status: 404 })
  }

  const isAdmin = hasRole(authResult.user.roles, "admin")
  if (!isAdmin && existing.ownerAuthId !== authResult.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const now = new Date()
  const company = !isAdmin && existing.companyId ? await getCompanyById(existing.companyId) : null
  const companyPlan = company ? resolveCompanyPlan(company) : null

  if (parsed.data.isActive) {
    if (existing.paymentStatus !== "paid") {
      return Response.json({ error: `This listing cannot be reopened: ${getJobStatusLabel(existing).toLowerCase()}.` }, { status: 400 })
    }

    if (isJobExpired(existing)) {
      return Response.json({ error: "This listing has expired. Create a new listing to publish it again." }, { status: 400 })
    }

    const publicationValidationMessage = getJobPublicationValidationMessage(getJobPublicationValidationReasons(existing))
    if (publicationValidationMessage) {
      return Response.json({ error: publicationValidationMessage }, { status: 400 })
    }

    if (!isAdmin && company && companyPlan) {
      const activeJobCount = await countPublishedJobsForCompany(company.id, { excludeJobId: existing.id, now })
      const nextActiveJobCount = activeJobCount + 1
      const maxActiveJobs = companyPlan.entitlements.maxActiveJobs

      if (!isWithinCompanyActiveJobLimit(nextActiveJobCount, companyPlan.effectivePlanId)) {
        return Response.json(
          {
            error:
              maxActiveJobs === null
                ? "This plan cannot publish another live job right now."
                : `Free plan allows up to ${maxActiveJobs} live jobs. Close one live job before publishing another.`
          },
          { status: 400 }
        )
      }
    }
  }

  if (typeof parsed.data.isFeatured === "boolean" && !isAdmin) {
    const featuredJobValidation = validateFeaturedJobRequest(parsed.data.isFeatured, companyPlan, {
      allowExistingFeatured: existing.isFeatured
    })

    if (!featuredJobValidation.ok) {
      return Response.json({ error: FEATURED_JOB_PLAN_MESSAGE }, { status: 400 })
    }
  }

  const nextValues: Partial<typeof jobs.$inferInsert> = {}

  if (typeof parsed.data.isActive === "boolean") {
    Object.assign(
      nextValues,
      parsed.data.isActive
        ? {
            isActive: true,
            activatedAt: existing.activatedAt ?? now,
            expiresAt: existing.expiresAt ?? calculateJobExpiration(existing.activatedAt ?? now, existing.listingDurationDays)
          }
        : { isActive: false }
    )
  }

  if (typeof parsed.data.isFeatured === "boolean") {
    Object.assign(nextValues, {
      isFeatured: parsed.data.isFeatured,
      featuredAt: getNextFeaturedAt({
        requestedIsFeatured: parsed.data.isFeatured,
        existingIsFeatured: existing.isFeatured,
        featuredAt: existing.featuredAt,
        now
      })
    })
  }

  const [updated] = await db
    .update(jobs)
    .set(nextValues)
    .where(eq(jobs.id, id))
    .returning()

  if (typeof parsed.data.isActive === "boolean") {
    await syncGoogleIndexingForJobTransition({
      before: existing,
      after: updated ?? existing
    })
  }

  return Response.json(updated)
}

export async function PUT(req: Request, { params }: JobRouteContext) {
  const authResult = await requireApiRoles(["business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const { id } = await params
  const payload = await req.json()
  const submissionAction = payload?.submissionAction === "publish" ? "publish" : "save"
  const parsed = jobWriteSchema.safeParse(payload)

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 })
  }

  if (parsed.data.website?.trim()) {
    return Response.json({ error: "Spam detected" }, { status: 400 })
  }

  const [existing] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1)

  if (!existing) {
    return Response.json({ error: "Job not found" }, { status: 404 })
  }

  const isAdmin = hasRole(authResult.user.roles, "admin")
  if (!isAdmin && existing.ownerAuthId !== authResult.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  let companyForJob

  try {
    companyForJob = await resolveCompanyForJob(parsed.data, authResult.user.id, isAdmin)
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to resolve company." }, { status: 400 })
  }

  if (!isAdmin && !companyForJob) {
    return Response.json({ error: "Complete business setup before editing a job." }, { status: 400 })
  }

  const companyPlan = !isAdmin && companyForJob ? resolveCompanyPlan(companyForJob) : null
  const featuredJobValidation = isAdmin
    ? { ok: true as const }
    : validateFeaturedJobRequest(parsed.data.isFeatured, companyPlan, {
        allowExistingFeatured: existing.isFeatured
      })

  if (!featuredJobValidation.ok) {
    return Response.json({ error: FEATURED_JOB_PLAN_MESSAGE }, { status: 400 })
  }

  const nextListingDurationDays =
    existing.activatedAt
      ? existing.listingDurationDays
      : !isAdmin && companyPlan && !companyPlan.entitlements.allowsLongerJobDuration
        ? JOB_LISTING_DEFAULT_DAYS
        : parsed.data.listingDurationDays
  const nextValues = buildJobWriteValues(parsed.data, companyForJob?.id ?? null)
  const shouldPublishNow = submissionAction === "publish"
  const shouldValidatePublication = existing.isActive || shouldPublishNow
  const publicationValidationReasons = shouldValidatePublication ? getJobPublicationValidationReasons(nextValues) : []
  const publicationValidationMessage = shouldValidatePublication ? getJobPublicationValidationMessage(publicationValidationReasons) : null

  if (publicationValidationMessage) {
    return Response.json({ error: publicationValidationMessage }, { status: 400 })
  }

  const now = new Date()

  if (shouldPublishNow && !existing.isActive && !isAdmin && companyForJob && companyPlan) {
    const activeJobCount = await countPublishedJobsForCompany(companyForJob.id, { excludeJobId: existing.id, now })
    const nextActiveJobCount = activeJobCount + 1
    const maxActiveJobs = companyPlan.entitlements.maxActiveJobs

    if (!isWithinCompanyActiveJobLimit(nextActiveJobCount, companyPlan.effectivePlanId)) {
      return Response.json(
        {
          error:
            maxActiveJobs === null
              ? "This plan cannot publish another live job right now."
              : `Free plan allows up to ${maxActiveJobs} live jobs. Close one live job before publishing another.`
        },
        { status: 400 }
      )
    }
  }

  const shouldRecalculateExpiration = Boolean(existing.activatedAt)
  const nextActivatedAt = shouldPublishNow ? existing.activatedAt ?? now : existing.activatedAt
  const [updated] = await db
    .update(jobs)
    .set({
      ...nextValues,
      isActive: shouldPublishNow ? true : existing.isActive,
      paymentStatus: existing.paymentStatus,
      activatedAt: nextActivatedAt,
      featuredAt: getNextFeaturedAt({
        requestedIsFeatured: nextValues.isFeatured,
        existingIsFeatured: existing.isFeatured,
        featuredAt: existing.featuredAt,
        now
      }),
      listingDurationDays: nextListingDurationDays,
      expiresAt:
        nextActivatedAt && (shouldRecalculateExpiration || shouldPublishNow)
          ? calculateJobExpiration(nextActivatedAt, nextListingDurationDays)
          : existing.expiresAt
    })
    .where(eq(jobs.id, id))
    .returning()

  await syncGoogleIndexingForJobTransition({
    before: existing,
    after: updated ?? existing
  })

  return Response.json(updated)
}

export async function DELETE(_req: Request, { params }: JobRouteContext) {
  const authResult = await requireApiRoles(["business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const { id } = await params
  const [existing] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1)

  if (!existing) {
    return Response.json({ error: "Job not found" }, { status: 404 })
  }

  const isAdmin = hasRole(authResult.user.roles, "admin")
  if (!isAdmin && existing.ownerAuthId !== authResult.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  await db.delete(jobs).where(eq(jobs.id, id))

  await syncGoogleIndexingForJobTransition({
    before: existing,
    after: null
  })

  return Response.json({ ok: true })
}
