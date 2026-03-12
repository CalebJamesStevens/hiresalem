import { getCompanyPlanLabel, type CompanyPlanId, type ResolvedCompanyPlan } from "@repo/db/plans"

export const MANUAL_UPGRADE_NOTE = "Upgrade from your billing page, or contact HireSalem if you need help with a pilot or manual change."

export const companyProfileLockedFeatureIds = ["social_links", "enhanced_company_story", "company_media"] as const
export const employerJobLockedFeatureIds = ["featured_job_visibility", "higher_job_limit"] as const

export type LockedCompanyFeatureId = (typeof companyProfileLockedFeatureIds)[number] | (typeof employerJobLockedFeatureIds)[number]

type LockedCompanyFeatureDefinition = {
  id: LockedCompanyFeatureId
  label: string
  description: string
  availableOn: CompanyPlanId[]
  isUnlocked: (plan: ResolvedCompanyPlan) => boolean
}

const LOCKED_COMPANY_FEATURES: Record<LockedCompanyFeatureId, LockedCompanyFeatureDefinition> = {
  social_links: {
    id: "social_links",
    label: "Social links",
    description: "Add social profiles to your business page so job seekers can learn more about your brand and community presence.",
    availableOn: ["enhanced_profile", "business_pro"],
    isUnlocked: (plan) => plan.entitlements.allowsSocialLinks
  },
  enhanced_company_story: {
    id: "enhanced_company_story",
    label: "Enhanced company story",
    description: "Unlock expanded about, why work here, and benefits-focused company-page sections for a richer employer presence.",
    availableOn: ["enhanced_profile", "business_pro"],
    isUnlocked: (plan) =>
      plan.entitlements.allowsExpandedAboutSection &&
      plan.entitlements.allowsWhyWorkHereSection &&
      plan.entitlements.allowsPerksAndBenefitsSection
  },
  company_media: {
    id: "company_media",
    label: "Cover image or gallery",
    description: "Add a cover image or limited gallery to give your business page more visual depth and stronger presentation.",
    availableOn: ["enhanced_profile", "business_pro"],
    isUnlocked: (plan) => plan.entitlements.allowsCompanyMediaGallery && plan.entitlements.allowsProfileHighlighting
  },
  featured_job_visibility: {
    id: "featured_job_visibility",
    label: "Featured placement",
    description: "Add a featured badge and boosted placement on eligible listing surfaces to help important roles stand out.",
    availableOn: ["featured_job", "business_pro"],
    isUnlocked: (plan) => plan.entitlements.allowsFeaturedJobs && plan.entitlements.allowsBoostedJobPlacement
  },
  higher_job_limit: {
    id: "higher_job_limit",
    label: "More active jobs",
    description: "Business Pro removes the 3-live-job cap so growing employers can keep more openings active at once.",
    availableOn: ["business_pro"],
    isUnlocked: (plan) => plan.entitlements.maxActiveJobs === null
  }
}

function formatPlanList(planIds: CompanyPlanId[]) {
  if (planIds.length === 0) {
    return ""
  }

  if (planIds.length === 1) {
    return getCompanyPlanLabel(planIds[0])
  }

  if (planIds.length === 2) {
    return `${getCompanyPlanLabel(planIds[0])} or ${getCompanyPlanLabel(planIds[1])}`
  }

  const labels = planIds.map((planId) => getCompanyPlanLabel(planId))
  return `${labels.slice(0, -1).join(", ")}, or ${labels.at(-1)}`
}

export function getLockedCompanyFeatureDefinition(featureId: LockedCompanyFeatureId) {
  return LOCKED_COMPANY_FEATURES[featureId]
}

export function getLockedCompanyFeatureMessage(plan: ResolvedCompanyPlan, featureId: LockedCompanyFeatureId) {
  const definition = getLockedCompanyFeatureDefinition(featureId)

  if (definition.isUnlocked(plan)) {
    return null
  }

  return {
    ...definition,
    availabilityLabel: `Available on ${formatPlanList(definition.availableOn)}`
  }
}

export function getEmployerPlanIncludedHighlights(plan: ResolvedCompanyPlan) {
  const highlights = [
    "Basic business profile with logo, short description, website, location, and live job list.",
    plan.entitlements.allowsFeaturedJobs
      ? "Featured badge and boosted placement are available for eligible job listings."
      : "Jobs publish with standard visibility across HireSalem listing surfaces.",
    plan.entitlements.maxActiveJobs === null ? "More than 3 live jobs can stay active at once." : `Up to ${plan.entitlements.maxActiveJobs} live jobs at once.`,
    plan.entitlements.allowsLongerJobDuration
      ? "Longer job duration can be enabled where pilot entitlements support it."
      : "Jobs use the fixed standard listing duration."
  ]

  if (plan.entitlements.allowsSocialLinks) {
    highlights.splice(
      1,
      0,
      "Richer business presence with social links, expanded about content, why work here, perks, and enhanced page presentation."
    )
  } else {
    highlights.splice(1, 0, "Standard company page presentation with core business details.")
  }

  if (plan.entitlements.allowsCompanyMediaGallery) {
    highlights.splice(2, 0, "Cover image or limited gallery support is included for stronger employer presentation.")
  }

  return highlights
}

export function getEmployerPlanUpgradeHighlights(plan: ResolvedCompanyPlan) {
  return (Object.keys(LOCKED_COMPANY_FEATURES) as LockedCompanyFeatureId[])
    .map((featureId) => getLockedCompanyFeatureMessage(plan, featureId))
    .filter((feature): feature is NonNullable<typeof feature> => Boolean(feature))
}

export function getLockedCompanyFeatures(plan: ResolvedCompanyPlan, featureIds: readonly LockedCompanyFeatureId[]) {
  return featureIds.map((featureId) => getLockedCompanyFeatureMessage(plan, featureId)).filter((feature): feature is NonNullable<typeof feature> => Boolean(feature))
}
