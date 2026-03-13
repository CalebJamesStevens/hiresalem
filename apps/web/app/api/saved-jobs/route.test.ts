import { beforeEach, describe, expect, mock, test } from "bun:test"

const requireApiRolesMock = mock(async () => ({
  user: {
    id: "user-1",
    email: "user@example.com",
    roles: ["user"]
  }
}))
const listSavedJobsForUserMock = mock(async () => [])
const createSavedJobMock = mock(async () => ({
  id: "saved-job-1",
  userAuthId: "user-1",
  recipientEmail: "user@example.com",
  jobId: "job-1",
  alertsEnabled: true,
  lastAlertedState: "live",
  createdAt: new Date("2026-03-13T00:00:00.000Z")
}))
const deleteSavedJobMock = mock(async () => ({ id: "saved-job-1" }))
const updateSavedJobAlertsMock = mock(async () => ({
  id: "saved-job-1",
  alertsEnabled: false
}))

mock.module("@/lib/api-auth", () => ({
  requireApiRoles: requireApiRolesMock
}))

mock.module("@/lib/saved-jobs", () => ({
  listSavedJobsForUser: listSavedJobsForUserMock,
  createSavedJob: createSavedJobMock,
  deleteSavedJob: deleteSavedJobMock,
  updateSavedJobAlerts: updateSavedJobAlertsMock
}))

describe("saved jobs routes", () => {
  beforeEach(() => {
    requireApiRolesMock.mockClear()
    listSavedJobsForUserMock.mockClear()
    createSavedJobMock.mockClear()
    deleteSavedJobMock.mockClear()
    updateSavedJobAlertsMock.mockClear()
  })

  test("lists saved jobs for the current user", async () => {
    const { GET } = await import("@/app/api/saved-jobs/route")
    const response = await GET()

    expect(response.status).toBe(200)
    expect(listSavedJobsForUserMock).toHaveBeenCalledWith("user-1")
  })

  test("creates a saved job using the account email", async () => {
    const { POST } = await import("@/app/api/saved-jobs/route")
    const response = await POST(
      new Request("http://localhost:3000/api/saved-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jobId: "7a8ad0f0-1bd0-4787-9007-e07efe500001"
        })
      })
    )

    expect(response.status).toBe(201)
    expect(createSavedJobMock).toHaveBeenCalledWith({
      userAuthId: "user-1",
      recipientEmail: "user@example.com",
      jobId: "7a8ad0f0-1bd0-4787-9007-e07efe500001"
    })
  })

  test("updates alert preferences for a saved job", async () => {
    const { PATCH } = await import("@/app/api/saved-jobs/[jobId]/route")
    const response = await PATCH(
      new Request("http://localhost:3000/api/saved-jobs/job-1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          alertsEnabled: false
        })
      }),
      {
        params: Promise.resolve({
          jobId: "job-1"
        })
      }
    )

    expect(response.status).toBe(200)
    expect(updateSavedJobAlertsMock).toHaveBeenCalledWith({
      userAuthId: "user-1",
      jobId: "job-1",
      alertsEnabled: false,
      recipientEmail: "user@example.com"
    })
  })

  test("removes a saved job", async () => {
    const { DELETE } = await import("@/app/api/saved-jobs/[jobId]/route")
    const response = await DELETE(new Request("http://localhost:3000/api/saved-jobs/job-1", { method: "DELETE" }), {
      params: Promise.resolve({
        jobId: "job-1"
      })
    })

    expect(response.status).toBe(200)
    expect(deleteSavedJobMock).toHaveBeenCalledWith({
      userAuthId: "user-1",
      jobId: "job-1"
    })
  })
})
