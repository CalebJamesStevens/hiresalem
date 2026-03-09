import { generateKeyPairSync } from "node:crypto"

import { describe, expect, test } from "bun:test"

import { buildGoogleServiceAccountJwt, getGoogleIndexingServiceAccount } from "@/lib/google-indexing"

const privateKey = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem"
  },
  publicKeyEncoding: {
    type: "spki",
    format: "pem"
  }
}).privateKey

describe("google indexing config", () => {
  test("returns null when indexing is not configured", () => {
    expect(getGoogleIndexingServiceAccount({} as NodeJS.ProcessEnv)).toBeNull()
  })

  test("supports explicit email and private key env vars", () => {
    expect(
      getGoogleIndexingServiceAccount({
        GOOGLE_INDEXING_API_CLIENT_EMAIL: "indexer@example.iam.gserviceaccount.com",
        GOOGLE_INDEXING_API_PRIVATE_KEY: "line-1\\nline-2"
      } as NodeJS.ProcessEnv)
    ).toEqual({
      clientEmail: "indexer@example.iam.gserviceaccount.com",
      privateKey: "line-1\nline-2"
    })
  })

  test("supports service account json", () => {
    expect(
      getGoogleIndexingServiceAccount({
        GOOGLE_INDEXING_API_SERVICE_ACCOUNT_JSON: JSON.stringify({
          client_email: "json@example.iam.gserviceaccount.com",
          private_key: "line-1\\nline-2"
        })
      } as NodeJS.ProcessEnv)
    ).toEqual({
      clientEmail: "json@example.iam.gserviceaccount.com",
      privateKey: "line-1\nline-2"
    })
  })
})

describe("google indexing jwt", () => {
  test("builds a three-part signed JWT for the service account assertion", () => {
    const token = buildGoogleServiceAccountJwt(
      {
        clientEmail: "indexer@example.iam.gserviceaccount.com",
        privateKey
      },
      new Date("2026-03-09T12:00:00.000Z")
    )

    const parts = token.split(".")

    expect(parts).toHaveLength(3)
    expect(parts.every(Boolean)).toBe(true)
  })
})
