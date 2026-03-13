import { beforeEach, describe, expect, mock, test } from "bun:test"

const requireApiRolesMock = mock(async () => ({
  user: {
    id: "admin-1",
    email: "admin@example.com",
    roles: ["admin"]
  }
}))
const getCompanyClaimRequestByIdMock = mock(async () => ({
  id: "claim-1",
  companyId: "company-1",
  requesterAuthId: "user-2",
  status: "pending"
}))
const parseCompanyClaimReviewInputMock = mock(() => ({
  success: true as const,
  data: {
    action: "approve" as const
  }
}))
const approveCompanyClaimRequestMock = mock(async () => ({
  claim: { id: "claim-1", status: "approved" },
  company: { id: "company-1", ownerAuthId: "user-2" }
}))
const rejectCompanyClaimRequestMock = mock(async () => ({
  id: "claim-1",
  status: "rejected"
}))
const grantRealmRoleToUserInKeycloakMock = mock(async () => ({ ok: true as const }))

mock.module("@/lib/api-auth", () => ({
  requireApiRoles: requireApiRolesMock
}))

mock.module("@/lib/company-claims", () => ({
  getCompanyClaimRequestById: getCompanyClaimRequestByIdMock,
  parseCompanyClaimReviewInput: parseCompanyClaimReviewInputMock,
  approveCompanyClaimRequest: approveCompanyClaimRequestMock,
  rejectCompanyClaimRequest: rejectCompanyClaimRequestMock
}))

mock.module("@/lib/keycloak", () => ({
  grantRealmRoleToUserInKeycloak: grantRealmRoleToUserInKeycloakMock
}))

describe("POST /api/admin/company-claims/[id]", () => {
  beforeEach(() => {
    requireApiRolesMock.mockClear()
    getCompanyClaimRequestByIdMock.mockClear()
    parseCompanyClaimReviewInputMock.mockClear()
    approveCompanyClaimRequestMock.mockClear()
    rejectCompanyClaimRequestMock.mockClear()
    grantRealmRoleToUserInKeycloakMock.mockClear()
  })

  test("enforces admin authorization", async () => {
    requireApiRolesMock.mockResolvedValueOnce({
      response: Response.json({ error: "Forbidden" }, { status: 403 })
    })

    const { POST } = await import("@/app/api/admin/company-claims/[id]/route")
    const response = await POST(new Request("http://localhost:3000/api/admin/company-claims/claim-1", { method: "POST" }), {
      params: Promise.resolve({
        id: "claim-1"
      })
    })

    expect(response.status).toBe(403)
    expect(getCompanyClaimRequestByIdMock).not.toHaveBeenCalled()
  })

  test("approves pending claims and grants the business role", async () => {
    const { POST } = await import("@/app/api/admin/company-claims/[id]/route")
    const response = await POST(
      new Request("http://localhost:3000/api/admin/company-claims/claim-1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "approve"
        })
      }),
      {
        params: Promise.resolve({
          id: "claim-1"
        })
      }
    )

    expect(response.status).toBe(200)
    expect(grantRealmRoleToUserInKeycloakMock).toHaveBeenCalledWith({
      userId: "user-2",
      roleName: "business"
    })
    expect(approveCompanyClaimRequestMock).toHaveBeenCalledWith({
      id: "claim-1",
      reviewerAuthId: "admin-1"
    })
  })
})
