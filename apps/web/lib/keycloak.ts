import { normalizeRoles, type AppRole } from "@/lib/authz"

type KeycloakConfig = {
  issuer: string
  tokenEndpoint: string
  adminBaseUrl: string
  clientId: string
  clientSecret: string
  defaultUserRole: string
}

type JwtPayload = Record<string, unknown>

export type KeycloakPasswordAuthResult = {
  sub: string
  email: string | null
  name: string | null
  roles: AppRole[]
}

export type RegistrationFailureReason =
  | "admin_config_missing"
  | "admin_unreachable"
  | "realm_not_found"
  | "admin_auth_failed"
  | "service_account_disabled"
  | "admin_forbidden"
  | "email_exists"
  | "create_failed"
  | "role_missing"
  | "role_assign_failed"

export type RoleGrantFailureReason =
  | "admin_config_missing"
  | "admin_unreachable"
  | "realm_not_found"
  | "admin_auth_failed"
  | "service_account_disabled"
  | "admin_forbidden"
  | "role_missing"
  | "role_assign_failed"

export type RegistrationResult =
  | { ok: true }
  | {
      ok: false
      reason: RegistrationFailureReason
    }

export type RoleGrantResult =
  | { ok: true }
  | {
      ok: false
      reason: RoleGrantFailureReason
    }

function isPlaceholder(value: string | undefined) {
  if (!value) {
    return true
  }

  return value.includes("your-keycloak") || value.includes("replace-with")
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".")

  if (parts.length < 2) {
    return null
  }

  const payload = parts[1]
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")

  try {
    const json = Buffer.from(padded, "base64").toString("utf8")
    return JSON.parse(json) as JwtPayload
  } catch {
    return null
  }
}

function collectRolesFromClaims(claims: JwtPayload | null) {
  if (!claims) {
    return []
  }

  const discovered = new Set<string>()

  const realmAccess = claims.realm_access
  if (realmAccess && typeof realmAccess === "object" && "roles" in realmAccess) {
    const roles = (realmAccess as { roles?: unknown }).roles
    if (Array.isArray(roles)) {
      for (const role of roles) {
        if (typeof role === "string") {
          discovered.add(role)
        }
      }
    }
  }

  const resourceAccess = claims.resource_access
  if (resourceAccess && typeof resourceAccess === "object") {
    for (const resource of Object.values(resourceAccess as JwtPayload)) {
      if (!resource || typeof resource !== "object" || !("roles" in resource)) {
        continue
      }

      const roles = (resource as { roles?: unknown }).roles
      if (Array.isArray(roles)) {
        for (const role of roles) {
          if (typeof role === "string") {
            discovered.add(role)
          }
        }
      }
    }
  }

  return normalizeRoles(Array.from(discovered))
}

function buildKeycloakConfig(): KeycloakConfig | null {
  const issuer = process.env.AUTH_KEYCLOAK_ISSUER ?? ""

  if (!issuer) {
    return null
  }

  let issuerUrl: URL

  try {
    issuerUrl = new URL(issuer)
  } catch {
    return null
  }
  const parts = issuerUrl.pathname.split("/").filter(Boolean)
  const realm = parts.at(-1)

  if (!realm) {
    return null
  }

  const tokenEndpoint = `${issuer}/protocol/openid-connect/token`
  const adminBaseUrl = `${issuerUrl.origin}/admin/realms/${realm}`

  const clientId = process.env.AUTH_KEYCLOAK_ADMIN_ID ?? process.env.AUTH_KEYCLOAK_ID ?? ""
  const clientSecret = process.env.AUTH_KEYCLOAK_ADMIN_SECRET ?? process.env.AUTH_KEYCLOAK_SECRET ?? ""

  if (isPlaceholder(clientId) || isPlaceholder(clientSecret)) {
    return null
  }

  return {
    issuer,
    tokenEndpoint,
    adminBaseUrl,
    clientId,
    clientSecret,
    defaultUserRole: process.env.AUTH_KEYCLOAK_DEFAULT_ROLE ?? "user"
  }
}

async function fetchClientCredentialsToken(config: KeycloakConfig) {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret
  })

  let response: Response

  try {
    response = await fetch(config.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    })
  } catch {
    return { ok: false as const, reason: "admin_unreachable" as const }
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "")
    console.error("Keycloak admin token request failed", response.status, bodyText)
    if (bodyText.includes("Realm does not exist")) {
      return { ok: false as const, reason: "realm_not_found" as const }
    }

    if (bodyText.includes("Client not enabled to retrieve service account")) {
      return { ok: false as const, reason: "service_account_disabled" as const }
    }

    return { ok: false as const, reason: "admin_auth_failed" as const }
  }

  const json = (await response.json()) as { access_token?: string }

  if (!json.access_token) {
    return { ok: false as const, reason: "admin_auth_failed" as const }
  }

  return { ok: true as const, token: json.access_token }
}

function extractUserIdFromLocation(location: string | null) {
  if (!location) {
    return null
  }

  const segments = location.split("/").filter(Boolean)
  return segments.at(-1) ?? null
}

async function lookupRealmRole(config: KeycloakConfig, adminToken: string, roleName: string) {
  const roleResponse = await fetch(`${config.adminBaseUrl}/roles/${encodeURIComponent(roleName)}`, {
    headers: {
      Authorization: `Bearer ${adminToken}`
    }
  })

  if (!roleResponse.ok) {
    const bodyText = await roleResponse.text().catch(() => "")
    console.error("Keycloak role lookup failed", roleName, roleResponse.status, bodyText)
    return { ok: false as const, reason: "role_missing" as const }
  }

  const role = (await roleResponse.json()) as { id?: string; name?: string }

  if (!role.id || !role.name) {
    return { ok: false as const, reason: "role_missing" as const }
  }

  return { ok: true as const, role }
}

async function assignRealmRoleToUser(config: KeycloakConfig, adminToken: string, userId: string, roleName: string): Promise<RoleGrantResult> {
  const roleResult = await lookupRealmRole(config, adminToken, roleName)
  if (!roleResult.ok) {
    return roleResult
  }

  const mapRoleResponse = await fetch(`${config.adminBaseUrl}/users/${userId}/role-mappings/realm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify([
      {
        id: roleResult.role.id,
        name: roleResult.role.name
      }
    ])
  })

  if (!mapRoleResponse.ok) {
    const bodyText = await mapRoleResponse.text().catch(() => "")
    console.error("Keycloak role assignment failed", roleName, mapRoleResponse.status, bodyText)
    if (mapRoleResponse.status === 403) {
      return { ok: false, reason: "admin_forbidden" }
    }
    return { ok: false, reason: "role_assign_failed" }
  }

  return { ok: true }
}

export async function registerUserInKeycloak(input: { name: string; email: string; password: string }): Promise<RegistrationResult> {
  const config = buildKeycloakConfig()

  if (!config) {
    return { ok: false, reason: "admin_config_missing" }
  }

  const tokenResult = await fetchClientCredentialsToken(config)
  if (!tokenResult.ok) {
    return { ok: false, reason: tokenResult.reason }
  }

  const adminToken = tokenResult.token

  const [firstName, ...rest] = input.name.trim().split(" ")
  const lastName = rest.join(" ").trim()

  const createResponse = await fetch(`${config.adminBaseUrl}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      username: input.email,
      email: input.email,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      enabled: true,
      emailVerified: false,
      credentials: [
        {
          type: "password",
          value: input.password,
          temporary: false
        }
      ]
    })
  })

  if (createResponse.status === 409) {
    return { ok: false, reason: "email_exists" }
  }

  if (!createResponse.ok) {
    const bodyText = await createResponse.text().catch(() => "")
    console.error("Keycloak create user failed", createResponse.status, bodyText)
    if (createResponse.status === 403) {
      return { ok: false, reason: "admin_forbidden" }
    }
    return { ok: false, reason: "create_failed" }
  }

  const userId = extractUserIdFromLocation(createResponse.headers.get("location"))

  if (!userId) {
    return { ok: false, reason: "create_failed" }
  }

  const roleResult = await assignRealmRoleToUser(config, adminToken, userId, config.defaultUserRole)
  if (!roleResult.ok) {
    return roleResult
  }

  return { ok: true }
}

export async function grantRealmRoleToUserInKeycloak(input: { userId: string; roleName: string }): Promise<RoleGrantResult> {
  const config = buildKeycloakConfig()

  if (!config) {
    return { ok: false, reason: "admin_config_missing" }
  }

  const tokenResult = await fetchClientCredentialsToken(config)
  if (!tokenResult.ok) {
    return { ok: false, reason: tokenResult.reason }
  }

  return assignRealmRoleToUser(config, tokenResult.token, input.userId, input.roleName)
}

export async function signInWithKeycloakPassword(input: { email: string; password: string }): Promise<KeycloakPasswordAuthResult | null> {
  const clientId = process.env.AUTH_KEYCLOAK_ID ?? ""
  const clientSecret = process.env.AUTH_KEYCLOAK_SECRET ?? ""
  const issuer = process.env.AUTH_KEYCLOAK_ISSUER ?? ""

  if (!clientId || !clientSecret || !issuer) {
    throw new Error("Keycloak auth configuration is incomplete")
  }

  const body = new URLSearchParams({
    grant_type: "password",
    client_id: clientId,
    client_secret: clientSecret,
    username: input.email,
    password: input.password,
    scope: "openid profile email"
  })

  const response = await fetch(`${issuer}/protocol/openid-connect/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  })

  if (!response.ok) {
    return null
  }

  const json = (await response.json()) as { access_token?: string; id_token?: string }

  if (!json.access_token) {
    return null
  }

  const accessClaims = decodeJwtPayload(json.access_token)
  const idClaims = json.id_token ? decodeJwtPayload(json.id_token) : null

  const sub = typeof (idClaims?.sub ?? accessClaims?.sub) === "string" ? String(idClaims?.sub ?? accessClaims?.sub) : null
  if (!sub) {
    return null
  }

  const email = typeof (idClaims?.email ?? accessClaims?.email) === "string" ? String(idClaims?.email ?? accessClaims?.email) : null
  const name = typeof (idClaims?.name ?? accessClaims?.name) === "string" ? String(idClaims?.name ?? accessClaims?.name) : null
  const roles = collectRolesFromClaims(accessClaims)

  return {
    sub,
    email,
    name,
    roles
  }
}
