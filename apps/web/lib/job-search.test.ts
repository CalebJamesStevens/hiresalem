import { describe, expect, test } from "bun:test"

import {
  buildJobsSearchPath,
  canonicalizeJobsSearchPath,
  hasActiveJobsSearchFilters,
  parseJobsSearchParams
} from "@/lib/job-search"

describe("parseJobsSearchParams", () => {
  test("uses relevance sort when a keyword search is present", () => {
    const params = parseJobsSearchParams({ q: "frontend", sort: undefined })

    expect(params.q).toBe("frontend")
    expect(params.sort).toBe("relevance")
    expect(params.page).toBe(1)
  })

  test("falls back to newest when relevance is requested without a keyword", () => {
    const params = parseJobsSearchParams({ sort: "relevance", page: "0" })

    expect(params.sort).toBe("newest")
    expect(params.page).toBe(1)
  })

  test("drops invalid enum values and parses numeric filters", () => {
    const params = parseJobsSearchParams({
      workMode: "planet-side",
      category: "engineering",
      minSalary: "85000.50",
      postedWithin: "7",
      page: "3"
    })

    expect(params.workMode).toBe("any")
    expect(params.category).toBe("engineering")
    expect(params.minSalary).toBe(85000.5)
    expect(params.postedWithin).toBe("7")
    expect(params.page).toBe(3)
  })
})

describe("jobs search URLs", () => {
  test("buildJobsSearchPath omits defaults from the query string", () => {
    const path = buildJobsSearchPath(
      parseJobsSearchParams({
        q: "design",
        workMode: "remote",
        sort: "relevance",
        page: "1"
      })
    )

    expect(path).toBe("/jobs?q=design&workMode=remote")
  })

  test("canonicalizeJobsSearchPath normalizes extra params and page state", () => {
    expect(canonicalizeJobsSearchPath("/jobs?q=frontend&page=0&saved=1")).toBe("/jobs?q=frontend")
  })

  test("hasActiveJobsSearchFilters ignores the default page", () => {
    expect(hasActiveJobsSearchFilters(parseJobsSearchParams({ page: "2" }))).toBe(false)
    expect(hasActiveJobsSearchFilters(parseJobsSearchParams({ applyType: "external" }))).toBe(true)
  })
})
