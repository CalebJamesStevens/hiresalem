import { describe, expect, test } from "bun:test"

import { buildApplicantInboxPath, parseApplicantInboxParams } from "@/lib/applicant-inbox"

describe("parseApplicantInboxParams", () => {
  test("normalizes filters and drops invalid stages", () => {
    const params = parseApplicantInboxParams({
      q: "  ava  ",
      jobId: "job-123",
      stage: "phone-screen",
      applicationId: "app-456"
    })

    expect(params).toEqual({
      q: "ava",
      jobId: "job-123",
      stage: "any",
      applicationId: "app-456"
    })
  })

  test("keeps known stages", () => {
    const params = parseApplicantInboxParams(new URLSearchParams("stage=interviewing&q=alex"))

    expect(params.stage).toBe("interviewing")
    expect(params.q).toBe("alex")
  })
})

describe("buildApplicantInboxPath", () => {
  test("omits default filters", () => {
    expect(
      buildApplicantInboxPath({
        q: "",
        jobId: "",
        stage: "any",
        applicationId: ""
      })
    ).toBe("/dashboard/applicants")
  })

  test("builds a deep link for a selected application", () => {
    expect(
      buildApplicantInboxPath({
        q: "lee",
        jobId: "job-123",
        stage: "new",
        applicationId: "app-456"
      })
    ).toBe("/dashboard/applicants?q=lee&jobId=job-123&stage=new&applicationId=app-456")
  })
})
