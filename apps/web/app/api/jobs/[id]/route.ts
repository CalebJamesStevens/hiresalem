import { eq } from "drizzle-orm"
import { z } from "zod"

import { hasRole, normalizeRoles } from "@/lib/authz"
import { getCompanyById } from "@/lib/companies"
import { consumeExtraSlotCredit, getAvailableExtraSlotCredits } from "@/lib/employer-add-ons"
import { getCommunityLimitErrorMessage } from "@/lib/employer-pricing"
import { FEATURED_JOB_PLAN_MESSAGE, FEATURED_JOB_SLOT_MESSAGE, featuresAllJobs, getNextFeaturedAt, validateFeaturedJobRequest } from "@/lib/featured-jobs"
import { getJobStatusLabel, isJobExpired, isJobPublished } from "@/lib/job-listing-billing"
import { countFeaturedPublishedJobsForCompany, countPublishedJobsForCompany } from "@/lib/jobs"
import {
  buildJobWriteValues,
  calculateJobExpiration,
  getJobPublicationValidationMessage,
  getJobPublicationValidationReasons,
  getPlanJobExpiration,
  getPlanListingDurationDays,
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

function resolvePlanScopedExpiration(input: {
  existingExpiresAt: Date | null
  activatedAt: Date
  listingDurationDays: number
  companyPlan: ReturnType<typeof resolveCompanyPlan> | null
  now: Date
}) {
  if (!input.companyPlan) {
    return input.existingExpiresAt ?? calculateJobExpiration(input.activatedAt, input.listingDurationDays)
  }

  if (input.existingExpiresAt) {
    return getPlanJobExpiration(input.activatedAt, input.listingDurationDays, input.companyPlan)
  }

  return getPlanJobExpiration(input.now, input.listingDurationDays, input.companyPlan)
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
      const availableExtraSlotCredits = maxActiveJobs !== null ? await getAvailableExtraSlotCredits(company.id) : 0

      if (!isWithinCompanyActiveJobLimit(nextActiveJobCount, companyPlan.effectivePlanId) && availableExtraSlotCredits <= 0) {
        return Response.json(
          {
            error: maxActiveJobs === null ? "This plan cannot publish another live job right now." : getCommunityLimitErrorMessage(nextActiveJobCount)
          },
          { status: 400 }
        )
      }

      if (existing.isFeatured) {
        const featuredJobValidation = validateFeaturedJobRequest(true, companyPlan, {
          currentFeaturedJobCount: await countFeaturedPublishedJobsForCompany(company.id, {
            excludeJobId: existing.id,
            now
          })
        })

        if (!featuredJobValidation.ok) {
          return Response.json(
            { error: featuredJobValidation.error === "featured_job_slot_limit_reached" ? FEATURED_JOB_SLOT_MESSAGE : FEATURED_JOB_PLAN_MESSAGE },
            { status: 400 }
          )
        }
      }
    }
  }

  if (typeof parsed.data.isFeatured === "boolean" && !isAdmin) {
    const featuredJobValidation = validateFeaturedJobRequest(parsed.data.isFeatured, companyPlan, {
      allowExistingFeatured: existing.isFeatured,
      currentFeaturedJobCount: company ? await countFeaturedPublishedJobsForCompany(company.id, { excludeJobId: existing.id, now }) : undefined
    })

    if (!featuredJobValidation.ok) {
      return Response.json({ error: featuredJobValidation.error === "featured_job_slot_limit_reached" ? FEATURED_JOB_SLOT_MESSAGE : FEATURED_JOB_PLAN_MESSAGE }, { status: 400 })
    }
  }

  const nextValues: Partial<typeof jobs.$inferInsert> = {}
  let shouldConsumeExtraSlot = false
  const preserveActiveFeaturedAddOn =
    typeof parsed.data.isFeatured === "boolean" &&
    !parsed.data.isFeatured &&
    Boolean(existing.featuredExpiresAt && existing.featuredExpiresAt.getTime() > now.getTime())

  if (typeof parsed.data.isActive === "boolean") {
    if (parsed.data.isActive && !existing.isActive && !isAdmin && company && companyPlan && companyPlan.entitlements.maxActiveJobs !== null) {
      const activeJobCount = await countPublishedJobsForCompany(company.id, { excludeJobId: existing.id, now })
      if (activeJobCount + 1 > companyPlan.entitlements.maxActiveJobs) {
        shouldConsumeExtraSlot = true
      }
    }

    Object.assign(
      nextValues,
      parsed.data.isActive
        ? {
            isActive: true,
            activatedAt: existing.activatedAt ?? now,
            expiresAt:
              isAdmin || !companyPlan
                ? existing.expiresAt ?? calculateJobExpiration(existing.activatedAt ?? now, existing.listingDurationDays)
                : resolvePlanScopedExpiration({
                    existingExpiresAt: existing.expiresAt,
                    activatedAt: existing.activatedAt ?? now,
                    listingDurationDays: existing.listingDurationDays,
                    companyPlan,
                    now
                  })
          }
        : { isActive: false }
    )
  }

  if (typeof parsed.data.isFeatured === "boolean") {
    Object.assign(nextValues, {
      isFeatured: parsed.data.isFeatured,
      featuredAt: preserveActiveFeaturedAddOn
        ? existing.featuredAt
        : getNextFeaturedAt({
            requestedIsFeatured: parsed.data.isFeatured,
            existingIsFeatured: existing.isFeatured,
            featuredAt: existing.featuredAt,
            now
          }),
      featuredExpiresAt:
        preserveActiveFeaturedAddOn
          ? existing.featuredExpiresAt
          : parsed.data.isFeatured && existing.featuredExpiresAt && existing.featuredExpiresAt.getTime() > now.getTime()
            ? existing.featuredExpiresAt
            : null
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

  if (shouldConsumeExtraSlot && existing.companyId) {
    await consumeExtraSlotCredit({
      companyId: existing.companyId,
      jobId: existing.id,
      now
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
  const requestedIsFeatured = !isAdmin && featuresAllJobs(companyPlan) ? true : parsed.data.isFeatured
  const shouldPublishNow = submissionAction === "publish"
  const shouldValidatePublication = existing.isActive || shouldPublishNow
  const currentFeaturedJobCount =
    !isAdmin && shouldValidatePublication && companyForJob
      ? await countFeaturedPublishedJobsForCompany(companyForJob.id, {
          excludeJobId: existing.id
        })
      : undefined
  const featuredJobValidation = isAdmin
    ? { ok: true as const, isFeatured: requestedIsFeatured }
    : validateFeaturedJobRequest(requestedIsFeatured, companyPlan, {
        allowExistingFeatured: existing.isFeatured,
        currentFeaturedJobCount
      })

  if (!featuredJobValidation.ok) {
    return Response.json({ error: featuredJobValidation.error === "featured_job_slot_limit_reached" ? FEATURED_JOB_SLOT_MESSAGE : FEATURED_JOB_PLAN_MESSAGE }, { status: 400 })
  }

  const nextListingDurationDays =
    existing.activatedAt
      ? existing.listingDurationDays
      : isAdmin
        ? parsed.data.listingDurationDays
        : getPlanListingDurationDays(parsed.data.listingDurationDays, companyPlan)
  const nextValues = {
    ...buildJobWriteValues(parsed.data, companyForJob?.id ?? null),
    isFeatured: featuredJobValidation.isFeatured
  }
  let shouldConsumeExtraSlot = false
  const publicationValidationReasons = shouldValidatePublication ? getJobPublicationValidationReasons(nextValues) : []
  const publicationValidationMessage = shouldValidatePublication ? getJobPublicationValidationMessage(publicationValidationReasons) : null

  if (publicationValidationMessage) {
    return Response.json({ error: publicationValidationMessage }, { status: 400 })
  }

  const now = new Date()
  const preserveActiveFeaturedAddOn =
    !nextValues.isFeatured && Boolean(existing.featuredExpiresAt && existing.featuredExpiresAt.getTime() > now.getTime())

  if (shouldPublishNow && !existing.isActive && !isAdmin && companyForJob && companyPlan) {
    const activeJobCount = await countPublishedJobsForCompany(companyForJob.id, { excludeJobId: existing.id, now })
    const nextActiveJobCount = activeJobCount + 1
    const maxActiveJobs = companyPlan.entitlements.maxActiveJobs
    const availableExtraSlotCredits = maxActiveJobs !== null ? await getAvailableExtraSlotCredits(companyForJob.id) : 0

    if (!isWithinCompanyActiveJobLimit(nextActiveJobCount, companyPlan.effectivePlanId) && availableExtraSlotCredits <= 0) {
      return Response.json(
        {
          error: maxActiveJobs === null ? "This plan cannot publish another live job right now." : getCommunityLimitErrorMessage(nextActiveJobCount)
        },
        { status: 400 }
      )
    }

    if (maxActiveJobs !== null && nextActiveJobCount > maxActiveJobs && availableExtraSlotCredits > 0) {
      shouldConsumeExtraSlot = true
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
      featuredAt: preserveActiveFeaturedAddOn
        ? existing.featuredAt
        : getNextFeaturedAt({
            requestedIsFeatured: nextValues.isFeatured,
            existingIsFeatured: existing.isFeatured,
            featuredAt: existing.featuredAt,
            now
          }),
      featuredExpiresAt: preserveActiveFeaturedAddOn
        ? existing.featuredExpiresAt
        : nextValues.isFeatured && existing.featuredExpiresAt && existing.featuredExpiresAt.getTime() > now.getTime()
          ? existing.featuredExpiresAt
          : null,
      listingDurationDays: nextListingDurationDays,
      expiresAt:
        nextActivatedAt && (shouldRecalculateExpiration || shouldPublishNow)
          ? isAdmin
            ? calculateJobExpiration(nextActivatedAt, nextListingDurationDays)
            : resolvePlanScopedExpiration({
                existingExpiresAt: existing.expiresAt,
                activatedAt: nextActivatedAt,
                listingDurationDays: nextListingDurationDays,
                companyPlan,
                now
              })
          : existing.expiresAt
    })
    .where(eq(jobs.id, id))
    .returning()

  await syncGoogleIndexingForJobTransition({
    before: existing,
    after: updated ?? existing
  })

  if (shouldConsumeExtraSlot && existing.companyId) {
    await consumeExtraSlotCredit({
      companyId: existing.companyId,
      jobId: existing.id,
      now
    })
  }

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
