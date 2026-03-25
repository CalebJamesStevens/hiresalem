import { isCompanyPlanId, type CompanyPlanId } from "@repo/db/plans"

export function getEmployerSelfServePlan(plan: string | null | undefined): CompanyPlanId {
  return isCompanyPlanId(plan) ? plan : "free"
}

export function getEmployerStartHref(planId: CompanyPlanId) {
  return `/employers/start?plan=${planId}`
}

export function getEmployerPlanSelectionHref(planId: CompanyPlanId) {
  if (planId === "free") {
    return "/dashboard/company?welcome=1"
  }

  return `/dashboard/plan?selectedPlan=${planId}&onboarding=1#pricing`
}

export function getEmployerExistingAccountHref(planId: CompanyPlanId) {
  if (planId === "free") {
    return "/dashboard/company"
  }

  return `/dashboard/plan?selectedPlan=${planId}#pricing`
}
