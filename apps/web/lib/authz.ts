export const appRoles = ["admin", "business", "user"] as const

export type AppRole = (typeof appRoles)[number]

const appRoleSet = new Set<AppRole>(appRoles)

export function normalizeRoles(value: unknown): AppRole[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((role): role is AppRole => typeof role === "string" && appRoleSet.has(role as AppRole))
}

export function hasRole(roles: AppRole[] | undefined, targetRole: AppRole) {
  return Boolean(roles?.includes(targetRole))
}

export function hasAnyRole(roles: AppRole[] | undefined, targetRoles: AppRole[]) {
  if (!roles || roles.length === 0) {
    return false
  }

  return targetRoles.some((role) => roles.includes(role))
}
