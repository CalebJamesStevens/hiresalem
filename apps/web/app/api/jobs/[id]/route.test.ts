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

const countPublishedJobsForCompanyMock = mock(async () => 2)
const syncGoogleIndexingMock = mock(async () => ({ ok: true, skipped: false }))

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
  countPublishedJobsForCompany: countPublishedJobsForCompanyMock
}))

mock.module("@/lib/job-write", () => ({
  getJobPublicationValidationReasons: () => [],
  getJobPublicationValidationMessage: () => null,
  calculateJobExpiration: (startedAt: Date, listingDurationDays: number) => new Date(startedAt.getTime() + listingDurationDays * 24 * 60 * 60 * 1000),
  jobWriteSchema: {
    safeParse: () => ({
      success: false
    })
  },
  resolveCompanyForJob: async () => null,
  buildJobWriteValues: () => ({}),
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
    syncGoogleIndexingMock.mockClear()
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
      error: "Featured placement is available on Featured Job or Business Pro."
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
})
