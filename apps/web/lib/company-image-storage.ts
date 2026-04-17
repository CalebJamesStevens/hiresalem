import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import path from "node:path"

import { absoluteUrl } from "@/lib/seo"

const companyImageContentTypes = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
} as const

type CompanyImageExtension = keyof typeof companyImageContentTypes

type CompanyImageStorageConfig = {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
}

export type StoredCompanyImageDownload = {
  body: Uint8Array
  contentLength: number
  contentType: string
  filename: string
}

export type CompanyImageValidationResult =
  | {
      ok: true
      file: File | null
    }
  | {
      ok: false
      errorCode: "invalid_logo_file_type" | "logo_file_too_large"
    }

const COMPANY_IMAGE_STORAGE_PREFIX = "company-images/"
const COMPANY_IMAGE_ROUTE_PREFIX = "/api/company-images/"
const MAX_COMPANY_IMAGE_BYTES = 2 * 1024 * 1024

let cachedClient: S3Client | null = null
let cachedConfigKey: string | null = null

function getRequiredEnvValue(
  name:
    | "RESUME_S3_ENDPOINT"
    | "RESUME_S3_REGION"
    | "RESUME_S3_BUCKET"
    | "RESUME_S3_ACCESS_KEY_ID"
    | "RESUME_S3_SECRET_ACCESS_KEY"
) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is not configured`)
  }

  return value
}

function normalizeStorageRegion(endpoint: string, configuredRegion: string) {
  try {
    const hostname = new URL(endpoint).hostname.toLowerCase()
    const looksLikeGarage = hostname === "garage" || hostname.startsWith("garage.") || hostname.includes(".garage.")

    if (looksLikeGarage && configuredRegion === "us-east-1") {
      return "garage"
    }
  } catch {
    return configuredRegion
  }

  return configuredRegion
}

function getCompanyImageStorageConfig(): CompanyImageStorageConfig {
  const endpoint = getRequiredEnvValue("RESUME_S3_ENDPOINT")
  const configuredRegion = getRequiredEnvValue("RESUME_S3_REGION")

  return {
    endpoint,
    region: normalizeStorageRegion(endpoint, configuredRegion),
    bucket: getRequiredEnvValue("RESUME_S3_BUCKET"),
    accessKeyId: getRequiredEnvValue("RESUME_S3_ACCESS_KEY_ID"),
    secretAccessKey: getRequiredEnvValue("RESUME_S3_SECRET_ACCESS_KEY"),
    forcePathStyle: process.env.RESUME_S3_FORCE_PATH_STYLE !== "false"
  }
}

function getCompanyImageStorageClient() {
  const config = getCompanyImageStorageConfig()
  const configKey = JSON.stringify(config)

  if (!cachedClient || cachedConfigKey !== configKey) {
    cachedClient = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    })
    cachedConfigKey = configKey
  }

  return {
    client: cachedClient,
    config
  }
}

function getCompanyImageExtension(filename: string): CompanyImageExtension {
  const extension = path.extname(filename).toLowerCase() as CompanyImageExtension

  if (!(extension in companyImageContentTypes)) {
    throw new Error("Unsupported company image extension")
  }

  return extension
}

function sanitizeCompanyImageFilename(filename: string, extension: CompanyImageExtension) {
  const baseName = path
    .basename(filename, extension)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .replace(/^[-_]+/, "")
    .slice(0, 80)

  return `${baseName || "company-image"}${extension}`
}

function encodeStoredFilename(filename: string) {
  return encodeURIComponent(filename)
}

function decodeStoredFilename(value: string | undefined, fallbackFilename: string) {
  if (!value) {
    return fallbackFilename
  }

  try {
    return decodeURIComponent(value)
  } catch {
    return fallbackFilename
  }
}

function buildStoredCompanyImageKey(extension: CompanyImageExtension) {
  return `${COMPANY_IMAGE_STORAGE_PREFIX}${crypto.randomUUID()}${extension}`
}

function isAbsoluteUrl(value: string) {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export function isStoredCompanyImageKey(value: string) {
  return value.startsWith(COMPANY_IMAGE_STORAGE_PREFIX)
}

export function isValidCompanyLogoValue(value: string) {
  return isStoredCompanyImageKey(value) || isAbsoluteUrl(value)
}

export function buildStoredCompanyImagePath(key: string) {
  if (!isStoredCompanyImageKey(key)) {
    throw new Error("Invalid stored company image key")
  }

  return `${COMPANY_IMAGE_ROUTE_PREFIX}${key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`
}

export function getCompanyImageSrc(value: string | null | undefined) {
  if (!value) {
    return null
  }

  return isStoredCompanyImageKey(value) ? buildStoredCompanyImagePath(value) : value
}

export function getAbsoluteCompanyImageUrl(value: string | null | undefined, origin?: string) {
  const src = getCompanyImageSrc(value)
  return src ? absoluteUrl(src, origin) : null
}

export function validateCompanyImageFile(file: File | null): CompanyImageValidationResult {
  if (!file || file.size === 0) {
    return { ok: true, file: null }
  }

  const extension = path.extname(file.name).toLowerCase()
  if (!(extension in companyImageContentTypes)) {
    return { ok: false, errorCode: "invalid_logo_file_type" }
  }

  const expectedContentType = companyImageContentTypes[extension as CompanyImageExtension]
  if (file.type && file.type !== expectedContentType) {
    return { ok: false, errorCode: "invalid_logo_file_type" }
  }

  if (file.size > MAX_COMPANY_IMAGE_BYTES) {
    return { ok: false, errorCode: "logo_file_too_large" }
  }

  return { ok: true, file }
}

export async function uploadCompanyImageFile(file: File) {
  const extension = getCompanyImageExtension(file.name)
  const sanitizedFilename = sanitizeCompanyImageFilename(file.name, extension)
  const key = buildStoredCompanyImageKey(extension)
  const { client, config } = getCompanyImageStorageClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentLength: buffer.byteLength,
      ContentType: companyImageContentTypes[extension],
      Metadata: {
        originalFilename: encodeStoredFilename(sanitizedFilename)
      }
    })
  )

  return key
}

export async function deleteStoredCompanyImage(key: string) {
  const { client, config } = getCompanyImageStorageClient()

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key
    })
  )
}

export async function downloadStoredCompanyImage(key: string): Promise<StoredCompanyImageDownload> {
  const { client, config } = getCompanyImageStorageClient()
  const response = await client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key
    })
  )

  const body = response.Body
  if (!body) {
    throw new Error("Company image body missing from storage response")
  }

  const bytes = await body.transformToByteArray()
  const extension = getCompanyImageExtension(key)
  const fallbackFilename = sanitizeCompanyImageFilename(path.basename(key), extension)

  return {
    body: bytes,
    contentLength: bytes.byteLength,
    contentType: response.ContentType || companyImageContentTypes[extension],
    filename: decodeStoredFilename(response.Metadata?.originalfilename, fallbackFilename)
  }
}
