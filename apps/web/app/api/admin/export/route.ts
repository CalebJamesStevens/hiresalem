import { buildAdminDataExport } from "@/lib/admin-export"
import { requireApiRoles } from "@/lib/api-auth"

export const runtime = "nodejs"

function buildExportFilename(exportedAt: string) {
  return `hiresalem-admin-export-${exportedAt.replaceAll(":", "-")}.json`
}

export async function GET() {
  const authResult = await requireApiRoles(["admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const payload = await buildAdminDataExport()

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${buildExportFilename(payload.exportedAt)}"`,
      "cache-control": "no-store"
    }
  })
}
