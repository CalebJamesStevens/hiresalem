import { hasRole, type AppRole } from "@/lib/authz"

export function getBusinessOnboardingRedirectPath(roles: AppRole[] | undefined, hasCompany: boolean) {
  if (hasRole(roles, "admin")) {
    return "/dashboard/jobs"
  }

  if (hasRole(roles, "business") && hasCompany) {
    return "/dashboard/company"
  }

  return null
}

export function shouldGrantBusinessRole(roles: AppRole[] | undefined) {
  return !hasRole(roles, "business") && !hasRole(roles, "admin")
}
