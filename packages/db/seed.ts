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
    plan: "standard" as const,
    linkedinUrl: "https://linkedin.com/company/salem-design-co",
    instagramUrl: "https://instagram.com/salemdesignco",
    aboutSection:
      "Salem Design Co partners with regional employers on product strategy, UX research, design systems, and customer experience work across the mid-valley.\n\nThe team works closely with local operators and founders, so candidates get exposure to both strategy and execution.",
    whyWorkHere:
      "You will work on visible local projects, collaborate directly with decision makers, and have room to shape process as the studio grows.",
    benefits:
      "- Hybrid flexibility for most roles\n- Professional development budget\n- Paid volunteer time for community-focused work",
    coverImageUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80",
    galleryImageUrl1: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80",
    galleryImageUrl2: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
    planOverrideReason: "Pilot enhanced profile account for local testing"
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    slug: "cherry-city-staffing",
    name: "Cherry City Staffing",
    ownerAuthId: "kc-business-003",
    logoUrl: "https://example.com/assets/cherry-city-staffing-logo.png",
    shortDescription: "Cherry City Staffing helps Salem employers fill operations, support, and skilled-trades roles quickly.",
    website: "https://example.com/cherry-city-staffing",
    location: "Salem, OR",
    plan: "partner" as const,
    isManaged: true,
    planOverrideReason: "Pilot partner account for local testing"
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
    isActive: false
  },
  {
    id: "aaaaaaa6-aaaa-aaaa-aaaa-aaaaaaaaaaa6",
    slug: "customer-support-lead-salem",
    title: "Customer Support Lead",
    ownerAuthId: "kc-business-003",
    companyId: "33333333-3333-3333-3333-333333333333",
    location: "Salem, OR",
    streetAddress: "255 State St",
    postalCode: "97301",
    salary: "$62k - $74k",
    workMode: "hybrid" as const,
    employmentType: "full_time" as const,
    category: "customer_support" as const,
    salaryMin: 62000,
    salaryMax: 74000,
    salaryCurrency: "USD",
    salaryInterval: "year" as const,
    description: "Lead frontline support operations, coach a small team, and improve customer response workflows.",
    applyType: "onsite" as const,
    applyUrl: null,
    isFeatured: true,
    featuredAt: new Date("2026-03-12T18:00:00.000Z"),
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
