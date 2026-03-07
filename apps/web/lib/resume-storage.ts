import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import path from "node:path"

const resumeContentTypes = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
} as const

type ResumeExtension = keyof typeof resumeContentTypes

type ResumeStorageConfig = {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
}

export type StoredResumeDownload = {
  body: Uint8Array
  contentLength: number
  contentType: string
  filename: string
}

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

function getResumeStorageConfig(): ResumeStorageConfig {
  const endpoint = getRequiredEnvValue("RESUME_S3_ENDPOINT")
  const configuredRegion = getRequiredEnvValue("RESUME_S3_REGION")

  return {
    endpoint,
    // Garage signs requests with the literal "garage" region. Many S3 examples default to
    // us-east-1, so normalize that common misconfiguration when the endpoint is clearly Garage.
    region: normalizeResumeStorageRegion(endpoint, configuredRegion),
    bucket: getRequiredEnvValue("RESUME_S3_BUCKET"),
    accessKeyId: getRequiredEnvValue("RESUME_S3_ACCESS_KEY_ID"),
    secretAccessKey: getRequiredEnvValue("RESUME_S3_SECRET_ACCESS_KEY"),
    forcePathStyle: process.env.RESUME_S3_FORCE_PATH_STYLE !== "false"
  }
}

function normalizeResumeStorageRegion(endpoint: string, configuredRegion: string) {
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

function getResumeStorageClient() {
  const config = getResumeStorageConfig()
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

function getResumeExtension(filename: string): ResumeExtension {
  const extension = path.extname(filename).toLowerCase() as ResumeExtension

  if (!(extension in resumeContentTypes)) {
    throw new Error("Unsupported resume extension")
  }

  return extension
}

function sanitizeResumeFilename(filename: string, extension: ResumeExtension) {
  const baseName = path
    .basename(filename, extension)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .replace(/^[-_]+/, "")
    .slice(0, 80)

  return `${baseName || "resume"}${extension}`
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

function buildStoredResumeKey(extension: ResumeExtension) {
  return `resumes/${crypto.randomUUID()}${extension}`
}

export function buildApplicationResumePath(applicationId: string) {
  return `/api/applications/${applicationId}/resume`
}

export function getLegacyResumeFilename(legacyPath: string) {
  const extension = getResumeExtension(legacyPath)
  return sanitizeResumeFilename(path.basename(legacyPath), extension)
}

export function getLegacyResumeContentType(legacyPath: string) {
  return resumeContentTypes[getResumeExtension(legacyPath)]
}

export async function uploadResumeFile(file: File) {
  const extension = getResumeExtension(file.name)
  const sanitizedFilename = sanitizeResumeFilename(file.name, extension)
  const key = buildStoredResumeKey(extension)
  const { client, config } = getResumeStorageClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentLength: buffer.byteLength,
      ContentType: resumeContentTypes[extension],
      Metadata: {
        originalFilename: encodeStoredFilename(sanitizedFilename)
      }
    })
  )

  return key
}

export async function deleteStoredResume(key: string) {
  const { client, config } = getResumeStorageClient()

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key
    })
  )
}

export async function downloadStoredResume(key: string): Promise<StoredResumeDownload> {
  const { client, config } = getResumeStorageClient()
  const response = await client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key
    })
  )

  const body = response.Body
  if (!body) {
    throw new Error("Resume body missing from storage response")
  }

  const bytes = await body.transformToByteArray()
  const extension = getResumeExtension(key)
  const fallbackFilename = sanitizeResumeFilename(path.basename(key), extension)

  return {
    body: bytes,
    contentLength: bytes.byteLength,
    contentType: response.ContentType || resumeContentTypes[extension],
    filename: decodeStoredFilename(response.Metadata?.originalfilename, fallbackFilename)
  }
}
