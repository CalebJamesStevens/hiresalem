import { describe, expect, test } from "bun:test"

import { jobDescriptionToHtml, normalizeJobDescriptionMarkdown } from "@/lib/markdown"

describe("normalizeJobDescriptionMarkdown", () => {
  test("turns short imported headings into bold labels", () => {
    const input = `### Position Title
Consumer Complaint Specialist - Civil Enforcement Division (Salem)

## Job Description
The Oregon Department of Justice is seeking a dynamic problem solver.`

    const normalized = normalizeJobDescriptionMarkdown(input)

    expect(normalized).toContain("**Position Title:**\nConsumer Complaint Specialist - Civil Enforcement Division (Salem)")
    expect(normalized).toContain("**Job Description:**\n\nThe Oregon Department of Justice is seeking a dynamic problem solver.")
  })

  test("turns long imported heading sentences into bold callouts instead of headings", () => {
    const input =
      "### Research suggests that women and people of color are less likely to apply unless they are confident they meet 100% of the listed qualifications."

    expect(normalizeJobDescriptionMarkdown(input)).toBe(
      "**Research suggests that women and people of color are less likely to apply unless they are confident they meet 100% of the listed qualifications.**"
    )
  })
})

describe("jobDescriptionToHtml", () => {
  test("does not emit heading tags for imported job description labels", () => {
    const html = jobDescriptionToHtml(`### Position Title
Consumer Complaint Specialist - Civil Enforcement Division (Salem)

## Job Description
The Oregon Department of Justice is seeking a dynamic problem solver.`)

    expect(html).toContain("<strong>Position Title:</strong><br />")
    expect(html).toContain("<strong>Job Description:</strong>")
    expect(html).not.toContain("<h2")
    expect(html).not.toContain("<h3")
  })
})
