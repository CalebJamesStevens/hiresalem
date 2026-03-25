import { beforeEach, describe, expect, mock, test } from "bun:test"

const requireApiRolesMock = mock(async () => ({
  user: {
    id: "owner-1",
    email: "owner@example.com",
    roles: ["business"]
  }
}))

const existingDraftJob = {
  id: "job-1",
  slug: "operations-manager",
  ownerAuthId: "owner-1",
  companyId: "company-1",
  isFeatured: false,
  isActive: false,
  paymentStatus: "paid" as const,
  listingDurationDays: 30,
  featuredAt: null,
  activatedAt: null,
  expiresAt: null,
  description: "Run daily operations.",
  workMode: "onsite" as const,
  jobLocationCity: "Salem",
  jobLocationRegion: "OR",
  jobLocationCountry: "US"
}

const updatedJob = {
  ...existingDraftJob,
  isActive: true,
  activatedAt: new Date("2026-03-12T18:00:00.000Z"),
  expiresAt: new Date("2026-04-11T18:00:00.000Z")
}

const selectLimitMock = mock(async () => [existingDraftJob])
const selectWhereMock = mock(() => ({
  limit: selectLimitMock
}))
const selectFromMock = mock(() => ({
  where: selectWhereMock
}))
const selectMock = mock(() => ({
  from: selectFromMock
}))

const updateReturningMock = mock(async () => [updatedJob])
const updateWhereMock = mock(() => ({
  returning: updateReturningMock
}))
const updateSetMock = mock(() => ({
  where: updateWhereMock
}))
const updateMock = mock(() => ({
  set: updateSetMock
}))

const getCompanyByIdMock = mock(async () => ({
  id: "company-1",
  plan: "free" as const,
  planOverride: null
}))

const countPublishedJobsForCompanyMock = mock(async () => 1)
const countFeaturedPublishedJobsForCompanyMock = mock(async () => 0)
const getAvailableExtraSlotCreditsMock = mock(async () => 0)
const consumeExtraSlotCreditMock = mock(async () => null)
const syncGoogleIndexingMock = mock(async () => ({ ok: true, skipped: false }))
const jobWriteSchemaSafeParseMock = mock(() => ({
  success: false
}))
const resolveCompanyForJobMock = mock(async () => null)
const buildJobWriteValuesMock = mock(() => ({}))
const calculateJobExpirationMock = mock((startedAt: Date, listingDurationDays: number) => new Date(startedAt.getTime() + listingDurationDays * 24 * 60 * 60 * 1000))
const getPlanJobExpirationMock = mock((_startedAt: Date, _listingDurationDays: number, plan?: { entitlements?: { jobExpiresAfterDays?: number | null } }) =>
  plan?.entitlements?.jobExpiresAfterDays === null ? null : new Date("2026-04-11T18:00:00.000Z")
)

mock.module("@/lib/api-auth", () => ({
  requireApiRoles: requireApiRolesMock
}))

mock.module("@/lib/authz", () => ({
  hasRole: (roles: string[], role: string) => roles.includes(role),
  normalizeRoles: (roles: string[]) => roles
}))

mock.module("@/lib/db", () => ({
  db: {
    select: selectMock,
    update: updateMock
  }
}))

mock.module("@/lib/companies", () => ({
  getCompanyById: getCompanyByIdMock
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
  getJobPublicationValidationReasons: () => [],
  getJobPublicationValidationMessage: () => null,
  calculateJobExpiration: calculateJobExpirationMock,
  getPlanListingDurationDays: (_listingDurationDays: number, plan?: { entitlements?: { jobExpiresAfterDays?: number | null } }) =>
    plan?.entitlements?.jobExpiresAfterDays ?? 30,
  getPlanJobExpiration: getPlanJobExpirationMock,
  jobWriteSchema: {
    safeParse: jobWriteSchemaSafeParseMock
  },
  resolveCompanyForJob: resolveCompanyForJobMock,
  buildJobWriteValues: buildJobWriteValuesMock,
  toJobSlug: () => "job"
}))

mock.module("@/lib/job-indexing", () => ({
  syncGoogleIndexingForJobTransition: syncGoogleIndexingMock
}))

describe("PATCH /api/jobs/[id]", () => {
  beforeEach(() => {
    requireApiRolesMock.mockClear()
    selectMock.mockClear()
    selectFromMock.mockClear()
    selectWhereMock.mockClear()
    selectLimitMock.mockClear()
    updateMock.mockClear()
    updateSetMock.mockClear()
    updateWhereMock.mockClear()
    updateReturningMock.mockClear()
    getCompanyByIdMock.mockClear()
    countPublishedJobsForCompanyMock.mockClear()
    countFeaturedPublishedJobsForCompanyMock.mockClear()
    getAvailableExtraSlotCreditsMock.mockClear()
    consumeExtraSlotCreditMock.mockClear()
    syncGoogleIndexingMock.mockClear()
    jobWriteSchemaSafeParseMock.mockClear()
    resolveCompanyForJobMock.mockClear()
    buildJobWriteValuesMock.mockClear()
    calculateJobExpirationMock.mockClear()
    getPlanJobExpirationMock.mockClear()
    jobWriteSchemaSafeParseMock.mockReturnValue({
      success: false
    })
    resolveCompanyForJobMock.mockResolvedValue(null)
    buildJobWriteValuesMock.mockReturnValue({})
  })

  test("publishes a draft job and stamps activation dates", async () => {
    const RealDate = Date
    const fixedNow = new RealDate("2026-03-12T18:00:00.000Z")
    // @ts-expect-error test override
    globalThis.Date = class extends RealDate {
      constructor(value?: string | number | Date) {
        super(value ?? fixedNow)
      }

      static now() {
        return fixedNow.getTime()
      }
    }

    try {
      const { PATCH } = await import("@/app/api/jobs/[id]/route")

      const response = await PATCH(
        new Request("http://localhost:3000/api/jobs/job-1", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ isActive: true })
        }),
        {
          params: Promise.resolve({
            id: "job-1"
          })
        }
      )

      expect(response.status).toBe(200)
      expect(updateSetMock).toHaveBeenCalledTimes(1)
      const [payload] = updateSetMock.mock.calls[0] ?? []
      expect(payload?.isActive).toBe(true)
      expect(payload?.activatedAt).toBeInstanceOf(RealDate)
      expect(payload?.expiresAt).toBeInstanceOf(RealDate)
      expect(payload?.expiresAt.getTime() - payload?.activatedAt.getTime()).toBe(30 * 24 * 60 * 60 * 1000)
    } finally {
      globalThis.Date = RealDate
    }
  })

  test("blocks featuring a free-plan job", async () => {
    const { PATCH } = await import("@/app/api/jobs/[id]/route")

    const response = await PATCH(
      new Request("http://localhost:3000/api/jobs/job-1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ isFeatured: true })
      }),
      {
        params: Promise.resolve({
          id: "job-1"
        })
      }
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "Spotlight placement is available on Standard or Partner."
    })
    expect(updateMock).not.toHaveBeenCalled()
  })

  test("allows removing featured placement even after access is lost", async () => {
    selectLimitMock.mockResolvedValueOnce([
      {
        ...existingDraftJob,
        isFeatured: true,
        featuredAt: new Date("2026-03-01T18:00:00.000Z")
      }
    ])
    const { PATCH } = await import("@/app/api/jobs/[id]/route")

    const response = await PATCH(
      new Request("http://localhost:3000/api/jobs/job-1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ isFeatured: false })
      }),
      {
        params: Promise.resolve({
          id: "job-1"
        })
      }
    )

    expect(response.status).toBe(200)
    const [payload] = updateSetMock.mock.calls.at(-1) ?? []
    expect(payload?.isFeatured).toBe(false)
    expect(payload?.featuredAt).toBeNull()
  })

  test("preserves an active weekly feature when removing the manual featured flag", async () => {
    const activeFeaturedUntil = new Date("2026-03-30T18:00:00.000Z")
    selectLimitMock.mockResolvedValueOnce([
      {
        ...existingDraftJob,
        isFeatured: true,
        featuredAt: new Date("2026-03-22T18:00:00.000Z"),
        featuredExpiresAt: activeFeaturedUntil
      }
    ])
    const { PATCH } = await import("@/app/api/jobs/[id]/route")

    const response = await PATCH(
      new Request("http://localhost:3000/api/jobs/job-1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ isFeatured: false })
      }),
      {
        params: Promise.resolve({
          id: "job-1"
        })
      }
    )

    expect(response.status).toBe(200)
    const [payload] = updateSetMock.mock.calls.at(-1) ?? []
    expect(payload?.isFeatured).toBe(false)
    expect(payload?.featuredAt).toBeInstanceOf(Date)
    expect(payload?.featuredExpiresAt).toBe(activeFeaturedUntil)
  })

  test("preserves an active weekly feature when editing content", async () => {
    const activeFeaturedUntil = new Date("2026-03-30T18:00:00.000Z")
    const existingJob = {
      ...existingDraftJob,
      isActive: true,
      featuredAt: new Date("2026-03-22T18:00:00.000Z"),
      featuredExpiresAt: activeFeaturedUntil,
      expiresAt: new Date("2026-04-11T18:00:00.000Z")
    }
    selectLimitMock.mockResolvedValueOnce([existingJob])
    jobWriteSchemaSafeParseMock.mockReturnValueOnce({
      success: true as const,
      data: {
        title: "Operations Manager",
        slug: "operations-manager",
        isFeatured: false,
        listingDurationDays: 30,
        website: "",
        applyType: "onsite"
      }
    })
    resolveCompanyForJobMock.mockResolvedValueOnce({
      id: "company-1",
      plan: "free" as const,
      planOverride: null
    })
    buildJobWriteValuesMock.mockReturnValueOnce({
      description: "Updated description",
      applyType: "onsite",
      isFeatured: false
    })

    const { PUT } = await import("@/app/api/jobs/[id]/route")

    const response = await PUT(
      new Request("http://localhost:3000/api/jobs/job-1", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "Operations Manager",
          slug: "operations-manager",
          description: "Updated description",
          applyType: "onsite",
          isFeatured: false,
          listingDurationDays: 30,
          submissionAction: "save",
          website: ""
        })
      }),
      {
        params: Promise.resolve({
          id: "job-1"
        })
      }
    )

    expect(response.status).toBe(200)
    const [payload] = updateSetMock.mock.calls.at(-1) ?? []
    expect(payload?.isFeatured).toBe(false)
    expect(payload?.featuredAt).toBe(existingJob.featuredAt)
    expect(payload?.featuredExpiresAt).toBe(activeFeaturedUntil)
  })

  test("uses the current time when a downgraded no-expiry job is reopened", async () => {
    const RealDate = Date
    const fixedNow = new RealDate("2026-03-24T18:00:00.000Z")

    // @ts-expect-error test override
    globalThis.Date = class extends RealDate {
      constructor(value?: string | number | Date) {
        super(value ?? fixedNow)
      }

      static now() {
        return fixedNow.getTime()
      }
    }

    selectLimitMock.mockResolvedValueOnce([
      {
        ...existingDraftJob,
        isActive: false,
        activatedAt: new RealDate("2026-01-01T18:00:00.000Z"),
        expiresAt: null
      }
    ])

    try {
      const { PATCH } = await import("@/app/api/jobs/[id]/route")

      const response = await PATCH(
        new Request("http://localhost:3000/api/jobs/job-1", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ isActive: true })
        }),
        {
          params: Promise.resolve({
            id: "job-1"
          })
        }
      )

      expect(response.status).toBe(200)
      expect(getPlanJobExpirationMock).toHaveBeenCalledTimes(1)
      const [startedAt] = getPlanJobExpirationMock.mock.calls[0] ?? []
      expect(startedAt).toBeInstanceOf(RealDate)
      expect(startedAt?.toISOString()).toBe(fixedNow.toISOString())
    } finally {
      globalThis.Date = RealDate
    }
  })

  test("uses the current time when editing a downgraded live job that previously had no expiry", async () => {
    const RealDate = Date
    const fixedNow = new RealDate("2026-03-24T18:00:00.000Z")

    // @ts-expect-error test override
    globalThis.Date = class extends RealDate {
      constructor(value?: string | number | Date) {
        super(value ?? fixedNow)
      }

      static now() {
        return fixedNow.getTime()
      }
    }

    selectLimitMock.mockResolvedValueOnce([
      {
        ...existingDraftJob,
        isActive: true,
        activatedAt: new RealDate("2026-01-01T18:00:00.000Z"),
        expiresAt: null
      }
    ])
    jobWriteSchemaSafeParseMock.mockReturnValueOnce({
      success: true as const,
      data: {
        title: "Operations Manager",
        slug: "operations-manager",
        isFeatured: false,
        listingDurationDays: 30,
        website: "",
        applyType: "onsite"
      }
    })
    resolveCompanyForJobMock.mockResolvedValueOnce({
      id: "company-1",
      plan: "free" as const,
      planOverride: null
    })
    buildJobWriteValuesMock.mockReturnValueOnce({
      description: "Updated description",
      applyType: "onsite",
      isFeatured: false
    })

    try {
      const { PUT } = await import("@/app/api/jobs/[id]/route")

      const response = await PUT(
        new Request("http://localhost:3000/api/jobs/job-1", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title: "Operations Manager",
            slug: "operations-manager",
            description: "Updated description",
            applyType: "onsite",
            isFeatured: false,
            listingDurationDays: 30,
            submissionAction: "save",
            website: ""
          })
        }),
        {
          params: Promise.resolve({
            id: "job-1"
          })
        }
      )

      expect(response.status).toBe(200)
      expect(getPlanJobExpirationMock).toHaveBeenCalledTimes(1)
      const [startedAt] = getPlanJobExpirationMock.mock.calls[0] ?? []
      expect(startedAt).toBeInstanceOf(RealDate)
      expect(startedAt?.toISOString()).toBe(fixedNow.toISOString())
    } finally {
      globalThis.Date = RealDate
    }
  })
})
