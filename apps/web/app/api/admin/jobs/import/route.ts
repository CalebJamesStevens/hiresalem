import { checkRateLimit } from "@/lib/rate-limit"
import { getRequestKey } from "@/lib/request"
import { requireApiRoles } from "@/lib/api-auth"
import { importNormalizedJobs } from "@repo/db/import/normalized-jobs"

export const runtime = "nodejs"

const MAX_IMPORT_BYTES = 10 * 1024 * 1024

function parseDryRunFlag(value: string | null) {
  if (!value) {
    return false
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase())
}

function isJsonContentType(contentType: string | null) {
  return Boolean(contentType && contentType.toLowerCase().includes("application/json"))
}

function isMultipartContentType(contentType: string | null) {
  return Boolean(contentType && contentType.toLowerCase().includes("multipart/form-data"))
}

function parseImportJson(input: string) {
  try {
    return JSON.parse(input) as unknown
  } catch {
    throw new Error("Import payload is not valid JSON")
  }
}

async function readPayloadFromMultipart(req: Request) {
  const formData = await req.formData()
  const fileEntry = formData.get("file")
  const payloadEntry = formData.get("payload")
  const dryRun = parseDryRunFlag(typeof formData.get("dryRun") === "string" ? String(formData.get("dryRun")) : null)

  if (fileEntry instanceof File) {
    if (fileEntry.size > MAX_IMPORT_BYTES) {
      throw new Error(`Import file must be ${Math.floor(MAX_IMPORT_BYTES / (1024 * 1024))} MB or smaller`)
    }

    return {
      payload: parseImportJson(await fileEntry.text()),
      dryRun
    }
  }

  if (typeof payloadEntry === "string") {
    if (payloadEntry.length > MAX_IMPORT_BYTES) {
      throw new Error(`Import payload must be ${Math.floor(MAX_IMPORT_BYTES / (1024 * 1024))} MB or smaller`)
    }

    return {
      payload: parseImportJson(payloadEntry),
      dryRun
    }
  }

  throw new Error("Expected a JSON file in form field `file` or a JSON string in form field `payload`")
}

async function readPayloadFromJson(req: Request) {
  const text = await req.text()
  if (!text.trim()) {
    throw new Error("Request body cannot be empty")
  }

  if (text.length > MAX_IMPORT_BYTES) {
    throw new Error(`Import payload must be ${Math.floor(MAX_IMPORT_BYTES / (1024 * 1024))} MB or smaller`)
  }

  const url = new URL(req.url)
  return {
    payload: parseImportJson(text),
    dryRun: parseDryRunFlag(url.searchParams.get("dryRun"))
  }
}

export async function POST(req: Request) {
  const authResult = await requireApiRoles(["admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const rate = checkRateLimit("jobs:batch-import", getRequestKey(req, authResult.user.id), 10, 60 * 60 * 1000)
  if (!rate.ok) {
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  try {
    const contentType = req.headers.get("content-type")
    const requestData = isMultipartContentType(contentType)
      ? await readPayloadFromMultipart(req)
      : isJsonContentType(contentType)
        ? await readPayloadFromJson(req)
        : null

    if (!requestData) {
      return Response.json(
        {
          error: "Unsupported content type. Use multipart/form-data with `file`, or application/json."
        },
        { status: 415 }
      )
    }

    const summary = await importNormalizedJobs(requestData.payload, { dryRun: requestData.dryRun })

    return Response.json(summary, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed"
    return Response.json({ error: message }, { status: 400 })
  }
}
