import { desc, eq, or, sql, type SQL } from "drizzle-orm"

import type { JobsSearchParams } from "@/lib/job-search"
import type { ResolvedCompanyPlan } from "@repo/db/plans"
import { companies } from "@repo/db/schema/companies"
import { jobs } from "@repo/db/schema/jobs"

export const FEATURED_JOB_PLAN_ERROR = "featured_job_plan_required"
export const FEATURED_JOB_PLAN_MESSAGE = "Featured placement is available on Featured Job or Business Pro."

export function canUseFeaturedJobs(plan?: Pick<ResolvedCompanyPlan, "entitlements"> | null) {
  return Boolean(plan?.entitlements.allowsFeaturedJobs && plan?.entitlements.allowsBoostedJobPlacement)
}

export function validateFeaturedJobRequest(
  requestedIsFeatured: boolean,
  plan?: Pick<ResolvedCompanyPlan, "entitlements"> | null,
  options?: {
    allowExistingFeatured?: boolean
  }
) {
  if (requestedIsFeatured && !canUseFeaturedJobs(plan) && !options?.allowExistingFeatured) {
    return {
      ok: false as const,
      error: FEATURED_JOB_PLAN_ERROR
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
    eq(companies.plan, "featured_job"),
    eq(companies.plan, "business_pro"),
    eq(companies.planOverride, "featured_job"),
    eq(companies.planOverride, "business_pro")
  )!
}

export function getFeaturedJobRankExpression() {
  return sql<number>`case when ${jobs.isFeatured} = true and ${getFeaturedPlanEligibilityCondition()} then 1 else 0 end`
}

export function getFeaturedJobVisibilityExpression() {
  return sql<boolean>`case when ${jobs.isFeatured} = true and ${getFeaturedPlanEligibilityCondition()} then true else false end`
}

export function getBoostedNewestJobOrderBy() {
  const featuredRank = getFeaturedJobRankExpression()
  return [desc(featuredRank), desc(jobs.featuredAt), desc(jobs.activatedAt), desc(jobs.createdAt)] as const
}

export function getBoostedRelevanceJobOrderBy(relevance: SQL<number>) {
  const featuredRank = getFeaturedJobRankExpression()
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
