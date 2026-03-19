import { beforeEach, describe, expect, mock, test } from "bun:test"

const requireApiRolesMock = mock(async () => ({
  user: {
    id: "admin-1",
    email: "admin@example.com",
    roles: ["admin"]
  }
}))

const buildAdminDataExportMock = mock(async () => ({
  exportedAt: "2026-03-13T20:10:11.000Z",
  companies: [
    {
      id: "company-1",
      slug: "acme",
      name: "Acme Co"
    }
  ],
  latestJobs: [
    {
      id: "job-1",
      slug: "operations-manager",
      title: "Operations Manager"
    }
  ],
  jobSelection: {
    limit: 5,
    maxAgeDays: null,
    createdSince: null
  }
}))

mock.module("@/lib/api-auth", () => ({
  requireApiRoles: requireApiRolesMock
}))

mock.module("@/lib/admin-export", () => ({
  ADMIN_EXPORT_JOB_LIMIT: 5,
  buildAdminDataExport: buildAdminDataExportMock
}))

describe("GET /api/admin/export", () => {
  const defaultRequest = new Request("http://localhost/api/admin/export")

  beforeEach(() => {
    requireApiRolesMock.mockClear()
    buildAdminDataExportMock.mockClear()
  })

  test("enforces admin authorization", async () => {
    requireApiRolesMock.mockResolvedValueOnce({
      response: Response.json({ error: "Forbidden" }, { status: 403 })
    })

    const { GET } = await import("@/app/api/admin/export/route")
    const response = await GET(defaultRequest)
    if (!response) {
      throw new Error("Expected a response")
    }

    expect(response.status).toBe(403)
    expect(buildAdminDataExportMock).not.toHaveBeenCalled()
  })

  test("returns a downloadable admin export for admins", async () => {
    const { GET } = await import("@/app/api/admin/export/route")
    const response = await GET(defaultRequest)
    if (!response) {
      throw new Error("Expected a response")
    }

    expect(response.status).toBe(200)
    expect(buildAdminDataExportMock).toHaveBeenCalledTimes(1)
    expect(buildAdminDataExportMock).toHaveBeenCalledWith({
      jobLimit: 5,
      jobMaxAgeDays: null
    })
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8")
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="hiresalem-admin-export-2026-03-13T20-10-11.000Z.json"'
    )
    await expect(response.json()).resolves.toEqual({
      exportedAt: "2026-03-13T20:10:11.000Z",
      companies: [
        {
          id: "company-1",
          slug: "acme",
          name: "Acme Co"
        }
      ],
      latestJobs: [
        {
          id: "job-1",
          slug: "operations-manager",
          title: "Operations Manager"
        }
      ],
      jobSelection: {
        limit: 5,
        maxAgeDays: null,
        createdSince: null
      }
    })
  })

  test("supports exporting every job across all time", async () => {
    const { GET } = await import("@/app/api/admin/export/route")
    const response = await GET(new Request("http://localhost/api/admin/export?allJobs=on&allTime=on"))
    if (!response) {
      throw new Error("Expected a response")
    }

    expect(response.status).toBe(200)
    expect(buildAdminDataExportMock).toHaveBeenCalledWith({
      jobLimit: null,
      jobMaxAgeDays: null
    })
  })

  test("uses validated numeric export options from the query string", async () => {
    const { GET } = await import("@/app/api/admin/export/route")
    const response = await GET(new Request("http://localhost/api/admin/export?jobLimit=100&jobMaxAgeDays=30"))
    if (!response) {
      throw new Error("Expected a response")
    }

    expect(response.status).toBe(200)
    expect(buildAdminDataExportMock).toHaveBeenCalledWith({
      jobLimit: 100,
      jobMaxAgeDays: 30
    })
  })

  test("still supports legacy all query values", async () => {
    const { GET } = await import("@/app/api/admin/export/route")
    const response = await GET(new Request("http://localhost/api/admin/export?jobLimit=all&jobMaxAgeDays=all"))
    if (!response) {
      throw new Error("Expected a response")
    }

    expect(response.status).toBe(200)
    expect(buildAdminDataExportMock).toHaveBeenCalledWith({
      jobLimit: null,
      jobMaxAgeDays: null
    })
  })
})
