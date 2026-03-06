import { describe, expect, test } from "bun:test"

import {
  buildEmployerWorkflowUpdate,
  canManageEmployerApplication,
  getEmployerApplicationStageCounts,
  parseEmployerWorkflowPatch
} from "@/lib/applicants"

describe("canManageEmployerApplication", () => {
  test("allows admins to manage any application", () => {
    expect(
      canManageEmployerApplication(
        {
          id: "user-1",
          isAdmin: true
        },
        "owner-1"
      )
    ).toBe(true)
  })

  test("restricts business users to their own jobs", () => {
    expect(
      canManageEmployerApplication(
        {
          id: "owner-1",
          isAdmin: false
        },
        "owner-1"
      )
    ).toBe(true)

    expect(
      canManageEmployerApplication(
        {
          id: "owner-1",
          isAdmin: false
        },
        "owner-2"
      )
    ).toBe(false)
  })
})

describe("parseEmployerWorkflowPatch", () => {
  test("rejects empty payloads", () => {
    const parsed = parseEmployerWorkflowPatch({})

    expect(parsed.success).toBe(false)
  })

  test("rejects invalid stages", () => {
    const parsed = parseEmployerWorkflowPatch({
      stage: "screen"
    })

    expect(parsed.success).toBe(false)
  })

  test("allows partial updates and normalizes blank text fields", () => {
    const parsed = parseEmployerWorkflowPatch({
      stage: "reviewed",
      internalNotes: "  ",
      nextStepNote: " Schedule intro call ",
      nextStepAt: "2026-03-06T20:30:00.000Z"
    })

    expect(parsed.success).toBe(true)

    if (!parsed.success) {
      return
    }

    expect(parsed.data.stage).toBe("reviewed")
    expect(parsed.data.internalNotes).toBeNull()
    expect(parsed.data.nextStepNote).toBe("Schedule intro call")
    expect(parsed.data.nextStepAt).toBeInstanceOf(Date)
  })
})

describe("buildEmployerWorkflowUpdate", () => {
  test("updates workflow fields and bumps stageUpdatedAt when the stage changes", () => {
    const update = buildEmployerWorkflowUpdate("new", {
      stage: "interviewing",
      internalNotes: "Strong portfolio",
      nextStepNote: "Book panel interview",
      lastContactedAt: new Date("2026-03-06T18:00:00.000Z")
    })

    expect(update.stage).toBe("interviewing")
    expect(update.internalNotes).toBe("Strong portfolio")
    expect(update.nextStepNote).toBe("Book panel interview")
    expect(update.updatedAt).toBeInstanceOf(Date)
    expect(update.stageUpdatedAt).toBeInstanceOf(Date)
  })

  test("keeps stageUpdatedAt unchanged when the stage stays the same", () => {
    const update = buildEmployerWorkflowUpdate("reviewed", {
      stage: "reviewed",
      internalNotes: null
    })

    expect(update.stage).toBe("reviewed")
    expect(update.internalNotes).toBeNull()
    expect(update.updatedAt).toBeInstanceOf(Date)
    expect(update.stageUpdatedAt).toBeUndefined()
  })
})

describe("getEmployerApplicationStageCounts", () => {
  test("counts each stage from the current filtered rows", () => {
    const counts = getEmployerApplicationStageCounts([
      { stage: "new" },
      { stage: "new" },
      { stage: "reviewed" },
      { stage: "offer" }
    ])

    expect(counts).toEqual({
      new: 2,
      reviewed: 1,
      interviewing: 0,
      offer: 1,
      rejected: 0
    })
  })
})
