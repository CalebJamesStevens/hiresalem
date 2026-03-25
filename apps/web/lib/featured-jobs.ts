import { desc, eq, or, sql, type SQL } from "drizzle-orm"

import { getActiveFeaturedAddOnCondition } from "@/lib/employer-add-ons"
import type { JobsSearchParams } from "@/lib/job-search"
import type { ResolvedCompanyPlan } from "@repo/db/plans"
import { companies } from "@repo/db/schema/companies"
import { jobs } from "@repo/db/schema/jobs"

export const FEATURED_JOB_PLAN_ERROR = "featured_job_plan_required"
export const FEATURED_JOB_PLAN_MESSAGE = "Spotlight placement is available on Standard or Partner."
export const FEATURED_JOB_SLOT_ERROR = "featured_job_slot_limit_reached"
export const FEATURED_JOB_SLOT_MESSAGE = "Your Standard plan Spotlight slot is already in use. Remove featured placement from another live job or upgrade to Partner."

export function canUseFeaturedJobs(plan?: Pick<ResolvedCompanyPlan, "entitlements"> | null) {
  return Boolean(plan?.entitlements.allowsFeaturedJobs && plan?.entitlements.allowsBoostedJobPlacement)
}

export function featuresAllJobs(plan?: Pick<ResolvedCompanyPlan, "entitlements"> | null) {
  return Boolean(canUseFeaturedJobs(plan) && plan?.entitlements.maxFeaturedJobs === null)
}

export function isJobFeaturedForPlan(
  job: Pick<{ isFeatured: boolean; featuredExpiresAt?: Date | null }, "isFeatured" | "featuredExpiresAt">,
  plan?: Pick<ResolvedCompanyPlan, "entitlements"> | null,
  now = new Date()
) {
  if (job.featuredExpiresAt && job.featuredExpiresAt.getTime() > now.getTime()) {
    return true
  }

  if (featuresAllJobs(plan)) {
    return true
  }

  if (!job.isFeatured) {
    return false
  }

  return canUseFeaturedJobs(plan)
}

export function validateFeaturedJobRequest(
  requestedIsFeatured: boolean,
  plan?: Pick<ResolvedCompanyPlan, "entitlements"> | null,
  options?: {
    allowExistingFeatured?: boolean
    currentFeaturedJobCount?: number
  }
) {
  if (requestedIsFeatured && featuresAllJobs(plan)) {
    return {
      ok: true as const,
      isFeatured: true
    }
  }

  if (requestedIsFeatured && !canUseFeaturedJobs(plan) && !options?.allowExistingFeatured) {
    return {
      ok: false as const,
      error: FEATURED_JOB_PLAN_ERROR
    }
  }

  const maxFeaturedJobs = plan?.entitlements.maxFeaturedJobs ?? 0
  if (
    requestedIsFeatured &&
    maxFeaturedJobs > 0 &&
    typeof options?.currentFeaturedJobCount === "number" &&
    options.currentFeaturedJobCount >= maxFeaturedJobs &&
    !options.allowExistingFeatured
  ) {
    return {
      ok: false as const,
      error: FEATURED_JOB_SLOT_ERROR
    }
  }

  return {
    ok: true as const,
    isFeatured: requestedIsFeatured
  }
}

export function shouldBoostFeaturedJobs(params: JobsSearchParams) {
  return params.sort === "newest" || (params.sort === "relevance" && Boolean(params.q))
}

export function getFeaturedPlanEligibilityCondition() {
  return or(
    eq(companies.plan, "standard"),
    eq(companies.plan, "partner"),
    eq(companies.planOverride, "standard"),
    eq(companies.planOverride, "partner")
  )!
}

export function getAutoFeaturedPlanEligibilityCondition() {
  return or(eq(companies.plan, "partner"), eq(companies.planOverride, "partner"))!
}

export function getFeaturedJobVisibilityCondition(now = new Date()) {
  return sql<boolean>`((${jobs.isFeatured} = true and ${getFeaturedPlanEligibilityCondition()}) or ${getAutoFeaturedPlanEligibilityCondition()} or ${getActiveFeaturedAddOnCondition(now)})`
}

export function getFeaturedJobRankExpression(now = new Date()) {
  return sql<number>`case when ${getFeaturedJobVisibilityCondition(now)} then 1 else 0 end`
}

export function getFeaturedJobVisibilityExpression(now = new Date()) {
  return sql<boolean>`case when ${getFeaturedJobVisibilityCondition(now)} then true else false end`
}

export function getBoostedNewestJobOrderBy(now = new Date()) {
  const featuredRank = getFeaturedJobRankExpression(now)
  return [desc(featuredRank), desc(jobs.featuredAt), desc(jobs.activatedAt), desc(jobs.createdAt)] as const
}

export function getBoostedRelevanceJobOrderBy(relevance: SQL<number>, now = new Date()) {
  const featuredRank = getFeaturedJobRankExpression(now)
  return [desc(featuredRank), desc(relevance), desc(jobs.featuredAt), desc(jobs.activatedAt), desc(jobs.createdAt)] as const
}

export function getNextFeaturedAt(input: {
  requestedIsFeatured: boolean
  existingIsFeatured?: boolean
  featuredAt?: Date | null
  now?: Date
}) {
  if (!input.requestedIsFeatured) {
    return null
  }

  if (input.existingIsFeatured && input.featuredAt) {
    return input.featuredAt
  }

  return input.now ?? new Date()
}
