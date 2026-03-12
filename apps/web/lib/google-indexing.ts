import { createSign } from "node:crypto"

const GOOGLE_INDEXING_SCOPE = "https://www.googleapis.com/auth/indexing"
const GOOGLE_TOKEN_AUDIENCE = "https://oauth2.googleapis.com/token"
const GOOGLE_INDEXING_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish"

type GoogleIndexingNotificationType = "URL_UPDATED" | "URL_DELETED"

type GoogleIndexingServiceAccount = {
  clientEmail: string
  privateKey: string
}

type GoogleTokenCache = {
  accessToken: string
  expiresAtMs: number
}

let tokenCache: GoogleTokenCache | null = null

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url")
}

function normalizePrivateKey(value: string) {
  return value.replaceAll("\\n", "\n").trim()
}

export function getGoogleIndexingServiceAccount(env: NodeJS.ProcessEnv = process.env): GoogleIndexingServiceAccount | null {
  const rawJson = env.GOOGLE_INDEXING_API_SERVICE_ACCOUNT_JSON?.trim()

  if (rawJson) {
    const parsed = JSON.parse(rawJson) as { client_email?: unknown; private_key?: unknown }
    if (typeof parsed.client_email !== "string" || typeof parsed.private_key !== "string") {
      throw new Error("GOOGLE_INDEXING_API_SERVICE_ACCOUNT_JSON must include client_email and private_key")
    }

    return {
      clientEmail: parsed.client_email.trim(),
      privateKey: normalizePrivateKey(parsed.private_key)
    }
  }

  const clientEmail = env.GOOGLE_INDEXING_API_CLIENT_EMAIL?.trim()
  const privateKey = env.GOOGLE_INDEXING_API_PRIVATE_KEY?.trim()

  if (!clientEmail && !privateKey) {
    return null
  }

  if (!clientEmail || !privateKey) {
    throw new Error("GOOGLE_INDEXING_API_CLIENT_EMAIL and GOOGLE_INDEXING_API_PRIVATE_KEY must both be configured")
  }

  return {
    clientEmail,
    privateKey: normalizePrivateKey(privateKey)
  }
}

export function getGoogleIndexingConfigurationStatus(env: NodeJS.ProcessEnv = process.env) {
  try {
    return {
      configured: Boolean(getGoogleIndexingServiceAccount(env)),
      error: null
    }
  } catch (error) {
    return {
      configured: false,
      error: error instanceof Error ? error.message : "Invalid Google Indexing API configuration"
    }
  }
}

export function buildGoogleServiceAccountJwt(
  serviceAccount: GoogleIndexingServiceAccount,
  now = new Date()
) {
  const header = {
    alg: "RS256",
    typ: "JWT"
  }
  const issuedAt = Math.floor(now.getTime() / 1000)
  const payload = {
    iss: serviceAccount.clientEmail,
    scope: GOOGLE_INDEXING_SCOPE,
    aud: GOOGLE_TOKEN_AUDIENCE,
    iat: issuedAt,
    exp: issuedAt + 3600
  }
  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`
  const signer = createSign("RSA-SHA256")
  signer.update(unsignedToken)
  signer.end()
  const signature = signer.sign(serviceAccount.privateKey, "base64url")

  return `${unsignedToken}.${signature}`
}

async function getGoogleIndexingAccessToken(serviceAccount: GoogleIndexingServiceAccount) {
  const nowMs = Date.now()

  if (tokenCache && tokenCache.expiresAtMs > nowMs + 60_000) {
    return tokenCache.accessToken
  }

  const assertion = buildGoogleServiceAccountJwt(serviceAccount)
  const response = await fetch(GOOGLE_TOKEN_AUDIENCE, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  })

  if (!response.ok) {
    const bodyText = await response.text()
    throw new Error(`Google token request failed (${response.status}): ${bodyText}`)
  }

  const body = (await response.json()) as {
    access_token?: unknown
    expires_in?: unknown
  }

  if (typeof body.access_token !== "string") {
    throw new Error("Google token response did not include access_token")
  }

  const expiresInSeconds = typeof body.expires_in === "number" ? body.expires_in : 3600
  tokenCache = {
    accessToken: body.access_token,
    expiresAtMs: nowMs + expiresInSeconds * 1000
  }

  return body.access_token
}

export async function publishGoogleIndexingNotification(input: {
  url: string
  type: GoogleIndexingNotificationType
  env?: NodeJS.ProcessEnv
}) {
  const serviceAccount = getGoogleIndexingServiceAccount(input.env)

  if (!serviceAccount) {
    return { ok: false as const, skipped: true as const }
  }

  const accessToken = await getGoogleIndexingAccessToken(serviceAccount)
  const response = await fetch(GOOGLE_INDEXING_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: input.url,
      type: input.type
    })
  })

  if (!response.ok) {
    const bodyText = await response.text()
    throw new Error(`Google indexing publish failed (${response.status}): ${bodyText}`)
  }

  return {
    ok: true as const,
    skipped: false as const
  }
}
