export const companyPlanIds = ["free", "standard", "partner"] as const

export type CompanyPlanId = (typeof companyPlanIds)[number]

export const DEFAULT_COMPANY_PLAN_ID: CompanyPlanId = "free"

export type CompanyPlanEntitlements = {
  maxActiveJobs: number | null
  maxFeaturedJobs: number | null
  jobExpiresAfterDays: number | null
  allowsSocialLinks: boolean
  allowsEnhancedCompanyProfileSections: boolean
  allowsExpandedAboutSection: boolean
  allowsWhyWorkHereSection: boolean
  allowsPerksAndBenefitsSection: boolean
  allowsCompanyMediaGallery: boolean
  allowsProfileHighlighting: boolean
  allowsFeaturedJobs: boolean
  allowsBoostedJobPlacement: boolean
  includesTopEmployerSlot: boolean
}

export type CompanyPlanDefinition = {
  id: CompanyPlanId
  label: string
  entitlements: CompanyPlanEntitlements
}

export type CompanyPlanAssignment = {
  plan?: CompanyPlanId | null
  planOverride?: CompanyPlanId | null
}

export const COMPANY_PLAN_DEFINITIONS: Record<CompanyPlanId, CompanyPlanDefinition> = {
  free: {
    id: "free",
    label: "Community",
    entitlements: {
      maxActiveJobs: 2,
      maxFeaturedJobs: 0,
      jobExpiresAfterDays: 30,
      allowsSocialLinks: false,
      allowsEnhancedCompanyProfileSections: false,
      allowsExpandedAboutSection: false,
      allowsWhyWorkHereSection: false,
      allowsPerksAndBenefitsSection: false,
      allowsCompanyMediaGallery: false,
      allowsProfileHighlighting: false,
      allowsFeaturedJobs: false,
      allowsBoostedJobPlacement: false,
      includesTopEmployerSlot: false
    }
  },
  standard: {
    id: "standard",
    label: "Standard",
    entitlements: {
      maxActiveJobs: null,
      maxFeaturedJobs: 1,
      jobExpiresAfterDays: null,
      allowsSocialLinks: true,
      allowsEnhancedCompanyProfileSections: true,
      allowsExpandedAboutSection: true,
      allowsWhyWorkHereSection: true,
      allowsPerksAndBenefitsSection: true,
      allowsCompanyMediaGallery: true,
      allowsProfileHighlighting: true,
      allowsFeaturedJobs: true,
      allowsBoostedJobPlacement: true,
      includesTopEmployerSlot: false
    }
  },
  partner: {
    id: "partner",
    label: "Partner",
    entitlements: {
      maxActiveJobs: null,
      maxFeaturedJobs: null,
      jobExpiresAfterDays: null,
      allowsSocialLinks: true,
      allowsEnhancedCompanyProfileSections: true,
      allowsExpandedAboutSection: true,
      allowsWhyWorkHereSection: true,
      allowsPerksAndBenefitsSection: true,
      allowsCompanyMediaGallery: true,
      allowsProfileHighlighting: true,
      allowsFeaturedJobs: true,
      allowsBoostedJobPlacement: true,
      includesTopEmployerSlot: true
    }
  }
}

export type ResolvedCompanyPlan = {
  basePlanId: CompanyPlanId
  overridePlanId: CompanyPlanId | null
  effectivePlanId: CompanyPlanId
  label: string
  source: "default" | "assigned" | "override"
  entitlements: CompanyPlanEntitlements
}

export function isCompanyPlanId(value: unknown): value is CompanyPlanId {
  return typeof value === "string" && companyPlanIds.includes(value as CompanyPlanId)
}

export function getCompanyPlanDefinition(planId: CompanyPlanId) {
  return COMPANY_PLAN_DEFINITIONS[planId]
}

export function getCompanyPlanLabel(planId: CompanyPlanId) {
  return getCompanyPlanDefinition(planId).label
}

export function getAssignedCompanyPlanId(input?: Pick<CompanyPlanAssignment, "plan"> | null) {
  return input?.plan ?? DEFAULT_COMPANY_PLAN_ID
}

export function getEffectiveCompanyPlanId(input?: CompanyPlanAssignment | null) {
  return input?.planOverride ?? getAssignedCompanyPlanId(input)
}

export function getCompanyPlanEntitlements(input?: CompanyPlanAssignment | CompanyPlanId | null) {
  const planId = typeof input === "string" ? input : getEffectiveCompanyPlanId(input)
  return getCompanyPlanDefinition(planId).entitlements
}

export function resolveCompanyPlan(input?: CompanyPlanAssignment | null): ResolvedCompanyPlan {
  const basePlanId = getAssignedCompanyPlanId(input)
  const overridePlanId = input?.planOverride ?? null
  const effectivePlanId = overridePlanId ?? basePlanId

  return {
    basePlanId,
    overridePlanId,
    effectivePlanId,
    label: getCompanyPlanLabel(effectivePlanId),
    source: overridePlanId ? "override" : basePlanId === DEFAULT_COMPANY_PLAN_ID ? "default" : "assigned",
    entitlements: getCompanyPlanEntitlements(effectivePlanId)
  }
}

export function isWithinCompanyActiveJobLimit(activeJobCount: number, input?: CompanyPlanAssignment | CompanyPlanId | null) {
  const { maxActiveJobs } = getCompanyPlanEntitlements(input)
  return maxActiveJobs === null || activeJobCount <= maxActiveJobs
}
