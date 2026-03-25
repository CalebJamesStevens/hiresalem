import { describe, expect, mock, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

mock.module("@/components/job-card", () => ({
  JobCard: ({ job }: { job: { id: string; title: string } }) => <article data-job-id={job.id}>{job.title}</article>
}))

describe("JobList", () => {
  test("renders featured jobs only once when the featured section is enabled", async () => {
    const { JobList } = await import("@/components/job-list")
    const html = renderToStaticMarkup(
      <JobList
        jobs={[
          {
            id: "job-featured",
            slug: "featured-role",
            title: "Featured Role",
            ownerAuthId: "owner-1",
            companyId: "company-1",
            location: "Salem, OR",
            jobLocationCity: "Salem",
            jobLocationRegion: "OR",
            jobLocationCountry: "US",
            streetAddress: null,
            postalCode: null,
            salary: null,
            workMode: "onsite",
            employmentType: "full_time",
            category: "operations",
            salaryMin: null,
            salaryMax: null,
            salaryCurrency: null,
            salaryInterval: null,
            description: "Featured opening",
            applyType: "onsite",
            applyUrl: null,
            isFeatured: true,
            isActive: true,
            listingDurationDays: 30,
            paymentStatus: "paid",
            activatedAt: new Date("2026-03-24T00:00:00.000Z"),
            expiresAt: null,
            createdAt: new Date("2026-03-24T00:00:00.000Z"),
            companyName: "Company One",
            companySlug: "company-one",
            companyWebsite: null
          },
          {
            id: "job-regular",
            slug: "regular-role",
            title: "Regular Role",
            ownerAuthId: "owner-1",
            companyId: "company-1",
            location: "Salem, OR",
            jobLocationCity: "Salem",
            jobLocationRegion: "OR",
            jobLocationCountry: "US",
            streetAddress: null,
            postalCode: null,
            salary: null,
            workMode: "onsite",
            employmentType: "full_time",
            category: "operations",
            salaryMin: null,
            salaryMax: null,
            salaryCurrency: null,
            salaryInterval: null,
            description: "Regular opening",
            applyType: "onsite",
            applyUrl: null,
            isFeatured: false,
            isActive: true,
            listingDurationDays: 30,
            paymentStatus: "paid",
            activatedAt: new Date("2026-03-23T00:00:00.000Z"),
            expiresAt: null,
            createdAt: new Date("2026-03-23T00:00:00.000Z"),
            companyName: "Company One",
            companySlug: "company-one",
            companyWebsite: null
          }
        ]}
        showFeaturedSection
      />
    )

    expect(html.match(/data-job-id="job-featured"/g)?.length ?? 0).toBe(1)
    expect(html.match(/data-job-id="job-regular"/g)?.length ?? 0).toBe(1)
  })
})
