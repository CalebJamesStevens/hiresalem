import { beforeEach, describe, expect, mock, test } from "bun:test"

const requireApiRolesMock = mock(async () => ({
  user: {
    id: "admin-1",
    email: "admin@example.com",
    roles: ["admin"]
  }
}))

const getCompanyByIdMock = mock(async () => ({
  id: "company-1",
  plan: "free" as const,
  planOverride: null,
  planOverrideReason: null
}))

const parseCompanyPlanInputMock = mock(() => ({
  success: true as const,
  data: {
    plan: "enhanced_profile" as const,
    planOverride: "business_pro" as const,
    planOverrideReason: "Chamber pilot"
  }
}))

const updateCompanyPlanAssignmentMock = mock(async () => ({
  id: "company-1",
  plan: "enhanced_profile" as const,
  planOverride: "business_pro" as const,
  planOverrideReason: "Chamber pilot"
}))

mock.module("@/lib/api-auth", () => ({
  requireApiRoles: requireApiRolesMock
}))

mock.module("@/lib/companies", () => ({
  getCompanyById: getCompanyByIdMock,
  parseCompanyPlanInput: parseCompanyPlanInputMock,
  getCompanyPlanValidationErrorCode: () => "invalid_company_plan",
  updateCompanyPlanAssignment: updateCompanyPlanAssignmentMock
}))

describe("POST /api/admin/companies/[id]/plan", () => {
  beforeEach(() => {
    requireApiRolesMock.mockClear()
    getCompanyByIdMock.mockClear()
    parseCompanyPlanInputMock.mockClear()
    updateCompanyPlanAssignmentMock.mockClear()
  })

  test("enforces admin authorization", async () => {
    requireApiRolesMock.mockResolvedValueOnce({
      response: Response.json({ error: "Forbidden" }, { status: 403 })
    })

    const { POST } = await import("@/app/api/admin/companies/[id]/plan/route")

    const response = await POST(
      new Request("http://localhost:3000/api/admin/companies/company-1/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          plan: "enhanced_profile"
        })
      }),
      {
        params: Promise.resolve({
          id: "company-1"
        })
      }
    )

    expect(response.status).toBe(403)
    expect(getCompanyByIdMock).not.toHaveBeenCalled()
  })

  test("updates company plan assignments for admins", async () => {
    const { POST } = await import("@/app/api/admin/companies/[id]/plan/route")

    const response = await POST(
      new Request("http://localhost:3000/api/admin/companies/company-1/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          plan: "enhanced_profile",
          planOverride: "business_pro",
          planOverrideReason: "Chamber pilot"
        })
      }),
      {
        params: Promise.resolve({
          id: "company-1"
        })
      }
    )

    expect(response.status).toBe(200)
    expect(parseCompanyPlanInputMock).toHaveBeenCalledTimes(1)
    expect(updateCompanyPlanAssignmentMock).toHaveBeenCalledWith({
      id: "company-1",
      plan: "enhanced_profile",
      planOverride: "business_pro",
      planOverrideReason: "Chamber pilot"
    })
    await expect(response.json()).resolves.toEqual({
      id: "company-1",
      plan: "enhanced_profile",
      planOverride: "business_pro",
      planOverrideReason: "Chamber pilot"
    })
  })
})
