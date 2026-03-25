import { desc, eq } from "drizzle-orm"
import { hasRole, normalizeRoles } from "@/lib/authz"
import { consumeExtraSlotCredit, getAvailableExtraSlotCredits } from "@/lib/employer-add-ons"
import { getCommunityLimitErrorMessage } from "@/lib/employer-pricing"
import { getPublishedJobsFilter } from "@/lib/job-listing-billing"
import { getSessionSafe } from "@/lib/session"
import { requireApiRoles } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { FEATURED_JOB_PLAN_MESSAGE, FEATURED_JOB_SLOT_MESSAGE, featuresAllJobs, getNextFeaturedAt, validateFeaturedJobRequest } from "@/lib/featured-jobs"
import { syncGoogleIndexingForJobTransition } from "@/lib/job-indexing"
import { countFeaturedPublishedJobsForCompany, countPublishedJobsForCompany } from "@/lib/jobs"
import { checkRateLimit } from "@/lib/rate-limit"
import { getRequestKey } from "@/lib/request"
import {
  buildJobWriteValues,
  calculateJobExpiration,
  getJobPublicationValidationMessage,
  getJobPublicationValidationReasons,
  getPlanJobExpiration,
  getPlanListingDurationDays,
  jobWriteSchema,
  resolveCompanyForJob,
  toJobSlug
} from "@/lib/job-write"
import { isWithinCompanyActiveJobLimit, resolveCompanyPlan } from "@repo/db/plans"
import { jobs } from "@repo/db/schema/jobs"

export async function GET() {
  const session = await getSessionSafe()
  const roles = normalizeRoles(session?.user?.roles)
  const isAdmin = hasRole(roles, "admin")

  const data = isAdmin
    ? await db.select().from(jobs).orderBy(desc(jobs.createdAt))
    : await db.select().from(jobs).where(getPublishedJobsFilter()).orderBy(desc(jobs.createdAt))

  return Response.json(data)
}

export async function POST(req: Request) {
  const authResult = await requireApiRoles(["business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const isAdmin = hasRole(authResult.user.roles, "admin")

  const rate = checkRateLimit("jobs:create", getRequestKey(req, authResult.user.id), 5, 60 * 60 * 1000)
  if (!rate.ok) {
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  const payload = await req.json()
  const submissionAction = payload?.submissionAction === "draft" ? "draft" : "publish"
  const parsed = jobWriteSchema.safeParse(payload)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 })
  }

  if (parsed.data.website?.trim()) {
    return Response.json({ error: "Spam detected" }, { status: 400 })
  }

  const title = parsed.data.title.trim()
  const baseSlug = toJobSlug(parsed.data.slug ?? title) || "job"
  const slug = parsed.data.slug ? baseSlug : `${baseSlug}-${Date.now().toString(36)}`
  let companyForJob

  try {
    companyForJob = await resolveCompanyForJob(parsed.data, authResult.user.id, isAdmin)
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to resolve company." }, { status: 400 })
  }

  if (!isAdmin && !companyForJob) {
    return Response.json({ error: "Complete business setup before posting a job." }, { status: 400 })
  }

  const now = new Date()
  const companyPlan = !isAdmin && companyForJob ? resolveCompanyPlan(companyForJob) : null
  const requestedIsFeatured = !isAdmin && featuresAllJobs(companyPlan) ? true : parsed.data.isFeatured
  const shouldPublishNow = isAdmin || submissionAction === "publish"
  const currentFeaturedJobCount = !isAdmin && shouldPublishNow && companyForJob ? await countFeaturedPublishedJobsForCompany(companyForJob.id) : undefined
  const featuredJobValidation = isAdmin
    ? { ok: true as const, isFeatured: requestedIsFeatured }
    : validateFeaturedJobRequest(requestedIsFeatured, companyPlan, {
        currentFeaturedJobCount
      })

  if (!featuredJobValidation.ok) {
    return Response.json({ error: featuredJobValidation.error === "featured_job_slot_limit_reached" ? FEATURED_JOB_SLOT_MESSAGE : FEATURED_JOB_PLAN_MESSAGE }, { status: 400 })
  }

  const listingDurationDays = isAdmin ? parsed.data.listingDurationDays : getPlanListingDurationDays(parsed.data.listingDurationDays, companyPlan)
  const jobValues = {
    ...buildJobWriteValues(parsed.data, companyForJob?.id ?? null),
    isFeatured: featuredJobValidation.isFeatured
  }
  let shouldConsumeExtraSlot = false
  const publicationValidationReasons = shouldPublishNow ? getJobPublicationValidationReasons(jobValues) : []
  const publicationValidationMessage = shouldPublishNow ? getJobPublicationValidationMessage(publicationValidationReasons) : null

  if (publicationValidationMessage) {
    return Response.json({ error: publicationValidationMessage }, { status: 400 })
  }

  if (isAdmin) {
    const [created] = await db
      .insert(jobs)
      .values({
        slug,
        ownerAuthId: authResult.user.id,
        ...jobValues,
        isActive: true,
        featuredAt: getNextFeaturedAt({
          requestedIsFeatured: jobValues.isFeatured,
          now
        }),
        listingDurationDays,
        paymentStatus: "paid",
        activatedAt: now,
        expiresAt: calculateJobExpiration(now, listingDurationDays)
      })
      .returning()

    await syncGoogleIndexingForJobTransition({
      before: null,
      after: created
    })

    return Response.json(created, { status: 201 })
  }

  if (shouldPublishNow && companyForJob && companyPlan) {
    const activeJobCount = await countPublishedJobsForCompany(companyForJob.id)
    const maxActiveJobs = companyPlan.entitlements.maxActiveJobs
    const nextActiveJobCount = activeJobCount + 1
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

  const [created] = await db
    .insert(jobs)
    .values({
      slug,
      ownerAuthId: authResult.user.id,
      ...jobValues,
      isActive: shouldPublishNow,
      featuredAt: getNextFeaturedAt({
        requestedIsFeatured: jobValues.isFeatured,
        now
      }),
      listingDurationDays,
      paymentStatus: "paid",
      activatedAt: shouldPublishNow ? now : null,
      expiresAt: shouldPublishNow ? getPlanJobExpiration(now, listingDurationDays, companyPlan) : null
    })
    .returning()

  if (shouldConsumeExtraSlot && created?.companyId) {
    await consumeExtraSlotCredit({
      companyId: created.companyId,
      jobId: created.id,
      now
    })
  }

  if (shouldPublishNow) {
    await syncGoogleIndexingForJobTransition({
      before: null,
      after: created
    })
  }

  return Response.json(created, { status: 201 })
}
