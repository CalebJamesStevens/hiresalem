import { desc, eq } from "drizzle-orm"
import { hasRole, normalizeRoles } from "@/lib/authz"
import { getPublishedJobsFilter, JOB_LISTING_DEFAULT_DAYS } from "@/lib/job-listing-billing"
import { getSessionSafe } from "@/lib/session"
import { requireApiRoles } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { syncGoogleIndexingForJobTransition } from "@/lib/job-indexing"
import { countPublishedJobsForCompany } from "@/lib/jobs"
import { checkRateLimit } from "@/lib/rate-limit"
import { getRequestKey } from "@/lib/request"
import {
  buildJobWriteValues,
  calculateJobExpiration,
  getJobPublicationValidationMessage,
  getJobPublicationValidationReasons,
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
  const listingDurationDays =
    !isAdmin && companyPlan && !companyPlan.entitlements.allowsLongerJobDuration ? JOB_LISTING_DEFAULT_DAYS : parsed.data.listingDurationDays
  const jobValues = buildJobWriteValues(parsed.data, companyForJob?.id ?? null)
  const shouldPublishNow = isAdmin || submissionAction === "publish"
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

  const [created] = await db
    .insert(jobs)
    .values({
      slug,
      ownerAuthId: authResult.user.id,
      ...jobValues,
      isActive: shouldPublishNow,
      listingDurationDays,
      paymentStatus: "paid",
      activatedAt: shouldPublishNow ? now : null,
      expiresAt: shouldPublishNow ? calculateJobExpiration(now, listingDurationDays) : null
    })
    .returning()

  if (shouldPublishNow) {
    await syncGoogleIndexingForJobTransition({
      before: null,
      after: created
    })
  }

  return Response.json(created, { status: 201 })
}
