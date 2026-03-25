import { beforeEach, describe, expect, mock, test } from "bun:test"

const requireApiRolesMock = mock(async () => ({
  user: {
    id: "owner-1",
    email: "owner@example.com",
    roles: ["business"]
  }
}))

const rateLimitMock = mock(() => ({ ok: true }))
const requestKeyMock = mock(() => "request-key")
const syncGoogleIndexingMock = mock(async () => ({ ok: true, skipped: false }))
const countPublishedJobsForCompanyMock = mock(async () => 0)
const countFeaturedPublishedJobsForCompanyMock = mock(async () => 0)
const getAvailableExtraSlotCreditsMock = mock(async () => 0)
const consumeExtraSlotCreditMock = mock(async () => null)

const parsedJobInput = {
  title: "Operations Manager",
  slug: "operations-manager",
  isFeatured: false,
  listingDurationDays: 45,
  website: "",
  applyType: "onsite"
}

const jobWriteSchemaSafeParseMock = mock(() => ({
  success: true as const,
  data: parsedJobInput
}))

const resolveCompanyForJobMock = mock(async () => ({
  id: "company-1",
  name: "Willamette Works",
  plan: "free" as const,
  planOverride: null
}))

const buildJobWriteValuesMock = mock(() => ({
  companyId: "company-1",
  description: "Run daily operations.",
  workMode: "onsite" as const,
  jobLocationCity: "Salem",
  jobLocationRegion: "OR",
  jobLocationCountry: "US",
  applyType: "onsite" as const,
  applyUrl: null,
  isFeatured: false
}))

const publicationReasonsMock = mock(() => [])
const publicationMessageMock = mock(() => null)
const toJobSlugMock = mock(() => "operations-manager")

const insertReturningMock = mock(async () => [
  {
    id: "job-1",
    slug: "operations-manager-abc123",
    ownerAuthId: "owner-1",
    companyId: "company-1",
    isActive: false,
    paymentStatus: "paid",
    listingDurationDays: 30,
    activatedAt: null,
    expiresAt: null
  }
])
const insertValuesMock = mock(() => ({
  returning: insertReturningMock
}))
const insertMock = mock(() => ({
  values: insertValuesMock
}))

mock.module("@/lib/api-auth", () => ({
  requireApiRoles: requireApiRolesMock
}))

mock.module("@/lib/authz", () => ({
  hasRole: (roles: string[], role: string) => roles.includes(role),
  normalizeRoles: (roles: string[]) => roles
}))

mock.module("@/lib/rate-limit", () => ({
  checkRateLimit: rateLimitMock
}))

mock.module("@/lib/request", () => ({
  getRequestKey: requestKeyMock
}))

mock.module("@/lib/job-indexing", () => ({
  syncGoogleIndexingForJobTransition: syncGoogleIndexingMock
}))

mock.module("@/lib/jobs", () => ({
  countPublishedJobsForCompany: countPublishedJobsForCompanyMock,
  countFeaturedPublishedJobsForCompany: countFeaturedPublishedJobsForCompanyMock
}))

mock.module("@/lib/employer-add-ons", () => ({
  getAvailableExtraSlotCredits: getAvailableExtraSlotCreditsMock,
  consumeExtraSlotCredit: consumeExtraSlotCreditMock,
  getActiveFeaturedAddOnCondition: () => false
}))

mock.module("@/lib/job-write", () => ({
  jobWriteSchema: {
    safeParse: jobWriteSchemaSafeParseMock
  },
  resolveCompanyForJob: resolveCompanyForJobMock,
  buildJobWriteValues: buildJobWriteValuesMock,
  getJobPublicationValidationReasons: publicationReasonsMock,
  getJobPublicationValidationMessage: publicationMessageMock,
  calculateJobExpiration: (startedAt: Date, listingDurationDays: number) => new Date(startedAt.getTime() + listingDurationDays * 24 * 60 * 60 * 1000),
  getPlanListingDurationDays: (_listingDurationDays: number, plan?: { entitlements?: { jobExpiresAfterDays?: number | null } }) =>
    plan?.entitlements?.jobExpiresAfterDays ?? 30,
  getPlanJobExpiration: (_startedAt: Date, _listingDurationDays: number, plan?: { entitlements?: { jobExpiresAfterDays?: number | null } }) =>
    plan?.entitlements?.jobExpiresAfterDays === null ? null : new Date("2026-04-11T18:00:00.000Z"),
  toJobSlug: toJobSlugMock
}))

mock.module("@/lib/db", () => ({
  db: {
    insert: insertMock
  }
}))

describe("POST /api/jobs", () => {
  beforeEach(() => {
    requireApiRolesMock.mockClear()
    rateLimitMock.mockClear()
    requestKeyMock.mockClear()
    syncGoogleIndexingMock.mockClear()
    countPublishedJobsForCompanyMock.mockClear()
    countFeaturedPublishedJobsForCompanyMock.mockClear()
    getAvailableExtraSlotCreditsMock.mockClear()
    consumeExtraSlotCreditMock.mockClear()
    jobWriteSchemaSafeParseMock.mockClear()
    resolveCompanyForJobMock.mockClear()
    buildJobWriteValuesMock.mockClear()
    publicationReasonsMock.mockClear()
    publicationMessageMock.mockClear()
    toJobSlugMock.mockClear()
    insertMock.mockClear()
    insertValuesMock.mockClear()
    insertReturningMock.mockClear()
  })

  test("blocks publishing a third live community-plan job", async () => {
    countPublishedJobsForCompanyMock.mockResolvedValueOnce(2)
    const { POST } = await import("@/app/api/jobs/route")

    const response = await POST(
      new Request("http://localhost:3000/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...parsedJobInput,
          submissionAction: "publish"
        })
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error:
        "You've hit the Community Limit! You currently have 3 active listings. To post more, you can buy a one-time Extra Slot ($29) or upgrade to Standard ($149/mo) to get unlimited listings and a managed business profile."
    })
    expect(insertMock).not.toHaveBeenCalled()
  })

  test("blocks featured placement on the free plan", async () => {
    jobWriteSchemaSafeParseMock.mockReturnValueOnce({
      success: true as const,
      data: {
        ...parsedJobInput,
        isFeatured: true
      }
    })
    buildJobWriteValuesMock.mockReturnValueOnce({
      companyId: "company-1",
      description: "Run daily operations.",
      workMode: "onsite" as const,
      jobLocationCity: "Salem",
      jobLocationRegion: "OR",
      jobLocationCountry: "US",
      applyType: "onsite" as const,
      applyUrl: null,
      isFeatured: true
    })
    const { POST } = await import("@/app/api/jobs/route")

    const response = await POST(
      new Request("http://localhost:3000/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...parsedJobInput,
          isFeatured: true,
          submissionAction: "publish"
        })
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "Spotlight placement is available on Standard or Partner."
    })
    expect(insertMock).not.toHaveBeenCalled()
  })

  test("allows saving a draft even when the live-job limit is reached and forces the community duration", async () => {
    countPublishedJobsForCompanyMock.mockResolvedValueOnce(2)
    const { POST } = await import("@/app/api/jobs/route")

    const response = await POST(
      new Request("http://localhost:3000/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...parsedJobInput,
          submissionAction: "draft"
        })
      })
    )

    expect(response.status).toBe(201)
    expect(insertValuesMock).toHaveBeenCalledTimes(1)
    const [payload] = insertValuesMock.mock.calls[0] ?? []
    expect(payload?.isActive).toBe(false)
    expect(payload?.paymentStatus).toBe("paid")
    expect(payload?.listingDurationDays).toBe(30)
    expect(payload?.activatedAt).toBeNull()
    expect(payload?.expiresAt).toBeNull()
    expect(syncGoogleIndexingMock).not.toHaveBeenCalled()
  })

  test("persists featured placement and longer duration when the request is allowed", async () => {
    requireApiRolesMock.mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@example.com",
        roles: ["admin"]
      }
    })
    jobWriteSchemaSafeParseMock.mockReturnValue({
      success: true as const,
      data: {
        ...parsedJobInput,
        isFeatured: true
      }
    })
    buildJobWriteValuesMock.mockReturnValue({
      companyId: "company-1",
      description: "Run daily operations.",
      workMode: "onsite" as const,
      jobLocationCity: "Salem",
      jobLocationRegion: "OR",
      jobLocationCountry: "US",
      applyType: "onsite" as const,
      applyUrl: null,
      isFeatured: true
    })
    const { POST } = await import("@/app/api/jobs/route")

    const response = await POST(
      new Request("http://localhost:3000/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...parsedJobInput,
          isFeatured: true,
          submissionAction: "publish"
        })
      })
    )

    expect(response.status).toBe(201)
    const [payload] = insertValuesMock.mock.calls.at(-1) ?? []
    expect(payload?.isFeatured).toBe(true)
    expect(payload?.featuredAt).toBeInstanceOf(Date)
    expect(payload?.listingDurationDays).toBe(45)
  })
})
