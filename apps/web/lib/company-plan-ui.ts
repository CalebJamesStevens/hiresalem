import { getCompanyPlanLabel, type CompanyPlanId, type ResolvedCompanyPlan } from "@repo/db/plans"

export const MANUAL_UPGRADE_NOTE = "Upgrade from your billing page, or contact HireSalem if you need help with a pilot or manual change."

export const companyProfileLockedFeatureIds = ["social_links", "enhanced_company_story", "company_media"] as const
export const employerJobLockedFeatureIds = ["featured_job_visibility", "higher_job_limit"] as const
const premiumEmployerLockedFeatureIds = ["top_employer_slot"] as const

export type LockedCompanyFeatureId =
  | (typeof companyProfileLockedFeatureIds)[number]
  | (typeof employerJobLockedFeatureIds)[number]
  | (typeof premiumEmployerLockedFeatureIds)[number]

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
    label: "Enhanced business profile",
    description: "Add social links so local candidates can connect your business page to the rest of your brand presence.",
    availableOn: ["standard", "partner"],
    isUnlocked: (plan) => plan.entitlements.allowsSocialLinks
  },
  enhanced_company_story: {
    id: "enhanced_company_story",
    label: "Join Our Team story",
    description: "Unlock expanded about, why work here, and benefits sections for a stronger Salem-first employer pitch.",
    availableOn: ["standard", "partner"],
    isUnlocked: (plan) =>
      plan.entitlements.allowsExpandedAboutSection &&
      plan.entitlements.allowsWhyWorkHereSection &&
      plan.entitlements.allowsPerksAndBenefitsSection
  },
  company_media: {
    id: "company_media",
    label: "Workspace photo gallery",
    description: "Add a cover image and gallery photos so candidates can picture the team, environment, and day-to-day workplace.",
    availableOn: ["standard", "partner"],
    isUnlocked: (plan) => plan.entitlements.allowsCompanyMediaGallery && plan.entitlements.allowsProfileHighlighting
  },
  featured_job_visibility: {
    id: "featured_job_visibility",
    label: "Featured Spotlight placement",
    description: "Pin an important role to the top of HireSalem surfaces so Salem-area candidates see it first.",
    availableOn: ["standard", "partner"],
    isUnlocked: (plan) => plan.entitlements.allowsFeaturedJobs && plan.entitlements.allowsBoostedJobPlacement
  },
  higher_job_limit: {
    id: "higher_job_limit",
    label: "Unlimited active listings",
    description: "Standard and Partner remove the 2-listing Community cap so you can keep multiple openings live at once.",
    availableOn: ["standard", "partner"],
    isUnlocked: (plan) => plan.entitlements.maxActiveJobs === null
  },
  top_employer_slot: {
    id: "top_employer_slot",
    label: "Top Employer slot",
    description: "Partner employers are eligible for the homepage Top Employer position that anchors the premium local roster.",
    availableOn: ["partner"],
    isUnlocked: (plan) => plan.entitlements.includesTopEmployerSlot
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
      ? plan.entitlements.maxFeaturedJobs === null
        ? "Every live listing receives Featured Spotlight placement."
        : `One live listing can use Featured Spotlight placement at a time.`
      : "Jobs publish with standard visibility across HireSalem listing surfaces.",
    plan.entitlements.maxActiveJobs === null ? "Unlimited live jobs can stay active at once." : `Up to ${plan.entitlements.maxActiveJobs} live jobs at once.`,
    plan.entitlements.jobExpiresAfterDays === null
      ? "Listings stay live with no expiry while the subscription remains active."
      : `Listings expire after ${plan.entitlements.jobExpiresAfterDays} days on the Community plan.`
  ]

  if (plan.entitlements.allowsSocialLinks) {
    highlights.splice(
      1,
      0,
      "Enhanced business profile with social links, team story content, benefits, and stronger page presentation."
    )
  } else {
    highlights.splice(1, 0, "Standard company page presentation with core business details.")
  }

  if (plan.entitlements.allowsCompanyMediaGallery) {
    highlights.splice(2, 0, "Cover image and gallery support are included for a more polished Join Our Team page.")
  }

  if (plan.entitlements.includesTopEmployerSlot) {
    highlights.push('Eligible for the homepage "Top Employer" slot.')
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
