import { ADMIN_EXPORT_JOB_LIMIT, buildAdminDataExport } from "@/lib/admin-export"
import { requireApiRoles } from "@/lib/api-auth"

export const runtime = "nodejs"

function parsePositiveInteger(value: string | null) {
  if (!value) {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function parseBooleanFlag(value: string | null) {
  return value === "true" || value === "on" || value === "1"
}

function parseJobLimit(value: string | null) {
  if (value === "all") {
    return null
  }

  return parsePositiveInteger(value) ?? ADMIN_EXPORT_JOB_LIMIT
}

function parseJobMaxAgeDays(value: string | null) {
  if (value === "all" || value === null) {
    return null
  }

  return parsePositiveInteger(value)
}

function buildExportFilename(exportedAt: string) {
  return `hiresalem-admin-export-${exportedAt.replaceAll(":", "-")}.json`
}

export async function GET(request: Request) {
  const authResult = await requireApiRoles(["admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const { searchParams } = new URL(request.url)
  const exportAllJobs = parseBooleanFlag(searchParams.get("allJobs"))
  const exportAllTime = parseBooleanFlag(searchParams.get("allTime"))
  const payload = await buildAdminDataExport({
    jobLimit: exportAllJobs ? null : parseJobLimit(searchParams.get("jobLimit")),
    jobMaxAgeDays: exportAllTime ? null : parseJobMaxAgeDays(searchParams.get("jobMaxAgeDays"))
  })

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${buildExportFilename(payload.exportedAt)}"`,
      "cache-control": "no-store"
    }
  })
}
