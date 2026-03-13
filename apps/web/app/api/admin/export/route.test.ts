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
  ]
}))

mock.module("@/lib/api-auth", () => ({
  requireApiRoles: requireApiRolesMock
}))

mock.module("@/lib/admin-export", () => ({
  buildAdminDataExport: buildAdminDataExportMock
}))

describe("GET /api/admin/export", () => {
  beforeEach(() => {
    requireApiRolesMock.mockClear()
    buildAdminDataExportMock.mockClear()
  })

  test("enforces admin authorization", async () => {
    requireApiRolesMock.mockResolvedValueOnce({
      response: Response.json({ error: "Forbidden" }, { status: 403 })
    })

    const { GET } = await import("@/app/api/admin/export/route")
    const response = await GET()
    if (!response) {
      throw new Error("Expected a response")
    }

    expect(response.status).toBe(403)
    expect(buildAdminDataExportMock).not.toHaveBeenCalled()
  })

  test("returns a downloadable admin export for admins", async () => {
    const { GET } = await import("@/app/api/admin/export/route")
    const response = await GET()
    if (!response) {
      throw new Error("Expected a response")
    }

    expect(response.status).toBe(200)
    expect(buildAdminDataExportMock).toHaveBeenCalledTimes(1)
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
      ]
    })
  })
})
