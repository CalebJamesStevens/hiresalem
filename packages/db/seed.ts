import { sql } from "drizzle-orm"

import { db } from "./client"
import { applications } from "./schema/applications"
import { companies } from "./schema/companies"
import { jobs } from "./schema/jobs"

const companyRows = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    slug: "willamette-works",
    name: "Willamette Works",
    ownerAuthId: "kc-business-001",
    logoUrl: "https://example.com/assets/willamette-works-logo.png",
    shortDescription: "Willamette Works builds operations software for logistics teams across the mid-valley.",
    website: "https://example.com/willamette",
    location: "Salem, OR",
    plan: "free" as const
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    slug: "salem-design-co",
    name: "Salem Design Co",
    ownerAuthId: "kc-business-002",
    logoUrl: "https://example.com/assets/salem-design-co-logo.png",
    shortDescription: "Salem Design Co helps regional employers ship better digital products and customer experiences.",
    website: "https://example.com/salem-design",
    location: "Keizer, OR",
    plan: "free" as const
  }
] as const

const jobRows = [
  {
    id: "aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
    slug: "frontend-developer-salem",
    title: "Frontend Developer",
    ownerAuthId: "kc-business-001",
    companyId: "11111111-1111-1111-1111-111111111111",
    location: "Salem, OR",
    streetAddress: "123 Liberty St NE",
    postalCode: "97301",
    salary: "$90k - $110k",
    workMode: "hybrid" as const,
    employmentType: "full_time" as const,
    category: "engineering" as const,
    salaryMin: 90000,
    salaryMax: 110000,
    salaryCurrency: "USD",
    salaryInterval: "year" as const,
    description: "Build customer-facing web features for a local logistics team.",
    applyType: "onsite" as const,
    applyUrl: null,
    isActive: true
  },
  {
    id: "aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
    slug: "operations-manager-salem",
    title: "Operations Manager",
    ownerAuthId: "kc-business-001",
    companyId: "11111111-1111-1111-1111-111111111111",
    location: "Salem, OR",
    streetAddress: "450 Mission St SE",
    postalCode: "97302",
    salary: "$80k - $95k",
    workMode: "onsite" as const,
    employmentType: "full_time" as const,
    category: "operations" as const,
    salaryMin: 80000,
    salaryMax: 95000,
    salaryCurrency: "USD",
    salaryInterval: "year" as const,
    description: "Lead day-to-day operations and process improvements.",
    applyType: "external" as const,
    applyUrl: "https://example.com/jobs/operations-manager",
    isActive: true
  },
  {
    id: "aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
    slug: "fullstack-engineer-salem",
    title: "Full Stack Engineer",
    ownerAuthId: "kc-business-002",
    companyId: "22222222-2222-2222-2222-222222222222",
    location: "Salem, OR",
    streetAddress: null,
    postalCode: null,
    salary: "$105k - $130k",
    workMode: "remote" as const,
    employmentType: "full_time" as const,
    category: "engineering" as const,
    salaryMin: 105000,
    salaryMax: 130000,
    salaryCurrency: "USD",
    salaryInterval: "year" as const,
    description: "Own product features from API to UI.",
    applyType: "onsite" as const,
    applyUrl: null,
    isActive: true
  },
  {
    id: "aaaaaaa4-aaaa-aaaa-aaaa-aaaaaaaaaaa4",
    slug: "ux-designer-salem",
    title: "UX Designer",
    ownerAuthId: "kc-business-002",
    companyId: "22222222-2222-2222-2222-222222222222",
    location: "Salem, OR",
    streetAddress: "780 Commercial St SE",
    postalCode: "97301",
    salary: "$75k - $90k",
    workMode: "hybrid" as const,
    employmentType: "full_time" as const,
    category: "design" as const,
    salaryMin: 75000,
    salaryMax: 90000,
    salaryCurrency: "USD",
    salaryInterval: "year" as const,
    description: "Design and validate user experiences for job seekers.",
    applyType: "onsite" as const,
    applyUrl: null,
    isActive: true
  },
  {
    id: "aaaaaaa5-aaaa-aaaa-aaaa-aaaaaaaaaaa5",
    slug: "accounting-specialist-salem",
    title: "Accounting Specialist",
    ownerAuthId: "kc-business-001",
    companyId: "11111111-1111-1111-1111-111111111111",
    location: "Salem, OR",
    streetAddress: "500 Center St NE",
    postalCode: "97301",
    salary: "$58k - $68k",
    workMode: "onsite" as const,
    employmentType: "full_time" as const,
    category: "finance" as const,
    salaryMin: 58000,
    salaryMax: 68000,
    salaryCurrency: "USD",
    salaryInterval: "year" as const,
    description: "Support payroll and monthly financial close operations.",
    applyType: "external" as const,
    applyUrl: "https://example.com/jobs/accounting-specialist",
    isActive: true
  }
] as const

const applicationRows = [
  {
    id: "bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
    jobId: "aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
    applicantAuthId: "kc-user-001",
    name: "Jordan Lee",
    email: "jordan@example.com",
    phone: "(503) 555-0113",
    location: "Salem, OR",
    resume: "https://example.com/resume/jordan",
    linkedinUrl: "https://linkedin.com/in/jordan-lee",
    portfolioUrl: "https://jordanlee.dev",
    coverLetter: "I have spent the last four years shipping frontend product work for logistics and local commerce teams."
  },
  {
    id: "bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2",
    jobId: "aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
    applicantAuthId: "kc-user-002",
    name: "Casey Nguyen",
    email: "casey@example.com",
    phone: "(971) 555-0192",
    location: "Portland, OR",
    resume: "https://example.com/resume/casey",
    linkedinUrl: "https://linkedin.com/in/casey-nguyen",
    portfolioUrl: null,
    coverLetter: "Most recently I owned React and Node features end to end, including performance and accessibility work."
  }
] as const

async function seed() {
  await db.execute(sql`select 1`)

  await db.insert(companies).values(companyRows).onConflictDoNothing()
  await db.insert(jobs).values(jobRows).onConflictDoNothing()
  await db.insert(applications).values(applicationRows).onConflictDoNothing()

  console.log(`Seed complete: ${companyRows.length} companies, ${jobRows.length} jobs, ${applicationRows.length} applications.`)
}

seed().catch((error) => {
  console.error("Seed failed", error)
  process.exit(1)
})
