import { eq } from "drizzle-orm"

import { db } from "../client"
import { companies } from "../schema/companies"
import { jobs } from "../schema/jobs"

const workModes = ["onsite", "hybrid", "remote"] as const
const employmentTypes = ["full_time", "part_time", "contract", "internship", "temporary"] as const
const categories = [
  "engineering",
  "design",
  "operations",
  "finance",
  "sales",
  "marketing",
  "customer_support",
  "healthcare",
  "education",
  "skilled_trades",
  "hospitality",
  "administration"
] as const
const salaryIntervals = ["hour", "week", "month", "year"] as const
const applyTypes = ["onsite", "external"] as const
const paymentStatuses = ["pending", "paid", "canceled", "expired"] as const

type WorkMode = (typeof workModes)[number]
type EmploymentType = (typeof employmentTypes)[number]
type Category = (typeof categories)[number]
type SalaryInterval = (typeof salaryIntervals)[number]
type ApplyType = (typeof applyTypes)[number]
type PaymentStatus = (typeof paymentStatuses)[number]

type RawCompany = {
  slug: unknown
  name: unknown
  ownerAuthId?: unknown
  website?: unknown
}

type RawJob = {
  slug: unknown
  title: unknown
  ownerAuthId?: unknown
  companyId?: unknown
  location?: unknown
  salary?: unknown
  workMode?: unknown
  employmentType?: unknown
  category?: unknown
  salaryMin?: unknown
  salaryMax?: unknown
  salaryCurrency?: unknown
  salaryInterval?: unknown
  description?: unknown
  applyType?: unknown
  applyUrl?: unknown
  isActive?: unknown
  listingDurationDays?: unknown
  paymentStatus?: unknown
  activatedAt?: unknown
  expiresAt?: unknown
  createdAt?: unknown
}

export type NormalizedJobsImportFile = {
  companies: RawCompany[]
  jobs: RawJob[]
}

type NormalizedCompany = {
  slug: string
  name: string
  ownerAuthId: string
  website: string | null
}

type NormalizedJob = {
  slug: string
  title: string
  ownerAuthId: string
  companySlug: string | null
  location: string | null
  salary: string | null
  workMode: WorkMode | null
  employmentType: EmploymentType | null
  category: Category | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  salaryInterval: SalaryInterval | null
  description: string | null
  applyType: ApplyType
  applyUrl: string | null
  isActive: boolean
  listingDurationDays: number
  paymentStatus: PaymentStatus
  activatedAt: Date | null
  expiresAt: Date | null
  createdAt: Date
}

type ImportPayload = {
  companies: NormalizedCompany[]
  jobs: NormalizedJob[]
}

export type ImportNormalizedJobsOptions = {
  dryRun?: boolean
}

export type ImportNormalizedJobsSummary = {
  dryRun: boolean
  insertedCompanies: number
  updatedCompanies: number
  insertedJobs: number
  updatedJobs: number
}

class DryRunRollback extends Error {
  constructor() {
    super("Dry run complete")
  }
}

function expectString(value: unknown, field: string) {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`)
  }

  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error(`${field} cannot be empty`)
  }

  return trimmed
}

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed || null
}

function optionalUpperCurrency(value: unknown) {
  const trimmed = optionalString(value)
  return trimmed ? trimmed.toUpperCase() : null
}

function optionalPositiveNumber(value: unknown, field: string) {
  if (value == null || value === "") {
    return null
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a positive number`)
  }

  return value
}

function optionalDate(value: unknown, field: string) {
  if (value == null || value === "") {
    return null
  }

  if (typeof value !== "string") {
    throw new Error(`${field} must be an ISO date string`)
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${field} must be a valid ISO date string`)
  }

  return parsed
}

function optionalEnum<TValue extends string>(value: unknown, field: string, values: readonly TValue[]) {
  if (value == null || value === "") {
    return null
  }

  if (typeof value !== "string" || !values.includes(value as TValue)) {
    throw new Error(`${field} must be one of: ${values.join(", ")}`)
  }

  return value as TValue
}

function requiredEnum<TValue extends string>(value: unknown, field: string, values: readonly TValue[]) {
  if (typeof value !== "string" || !values.includes(value as TValue)) {
    throw new Error(`${field} must be one of: ${values.join(", ")}`)
  }

  return value as TValue
}

function requiredBoolean(value: unknown, field: string) {
  if (typeof value !== "boolean") {
    throw new Error(`${field} must be a boolean`)
  }

  return value
}

function requiredInt(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer`)
  }

  return value
}

function normalizeCompanyOwnerAuthId(rawOwnerAuthId: unknown, slug: string) {
  const base = optionalString(rawOwnerAuthId) ?? "system"
  return `${base}:${slug}`
}

function normalizeCompany(raw: RawCompany): NormalizedCompany {
  const slug = expectString(raw.slug, "companies[].slug")
  return {
    slug,
    name: expectString(raw.name, `companies[${slug}].name`),
    ownerAuthId: normalizeCompanyOwnerAuthId(raw.ownerAuthId, slug),
    website: optionalString(raw.website)
  }
}

function normalizeJob(raw: RawJob): NormalizedJob {
  const slug = expectString(raw.slug, "jobs[].slug")
  const salaryMin = optionalPositiveNumber(raw.salaryMin, `jobs[${slug}].salaryMin`)
  const salaryMax = optionalPositiveNumber(raw.salaryMax, `jobs[${slug}].salaryMax`)

  if (salaryMin && salaryMax && salaryMin > salaryMax) {
    throw new Error(`jobs[${slug}].salaryMin cannot be greater than salaryMax`)
  }

  const applyType = requiredEnum(raw.applyType, `jobs[${slug}].applyType`, applyTypes)
  const applyUrl = optionalString(raw.applyUrl)

  if (applyType === "external" && !applyUrl) {
    throw new Error(`jobs[${slug}] must include applyUrl when applyType is external`)
  }

  return {
    slug,
    title: expectString(raw.title, `jobs[${slug}].title`),
    ownerAuthId: optionalString(raw.ownerAuthId) ?? "system",
    companySlug: optionalString(raw.companyId),
    location: optionalString(raw.location),
    salary: optionalString(raw.salary),
    workMode: optionalEnum(raw.workMode, `jobs[${slug}].workMode`, workModes),
    employmentType: optionalEnum(raw.employmentType, `jobs[${slug}].employmentType`, employmentTypes),
    category: optionalEnum(raw.category, `jobs[${slug}].category`, categories),
    salaryMin,
    salaryMax,
    salaryCurrency: optionalUpperCurrency(raw.salaryCurrency),
    salaryInterval: optionalEnum(raw.salaryInterval, `jobs[${slug}].salaryInterval`, salaryIntervals),
    description: optionalString(raw.description),
    applyType,
    applyUrl,
    isActive: requiredBoolean(raw.isActive, `jobs[${slug}].isActive`),
    listingDurationDays: requiredInt(raw.listingDurationDays, `jobs[${slug}].listingDurationDays`),
    paymentStatus: requiredEnum(raw.paymentStatus, `jobs[${slug}].paymentStatus`, paymentStatuses),
    activatedAt: optionalDate(raw.activatedAt, `jobs[${slug}].activatedAt`),
    expiresAt: optionalDate(raw.expiresAt, `jobs[${slug}].expiresAt`),
    createdAt: optionalDate(raw.createdAt, `jobs[${slug}].createdAt`) ?? new Date()
  }
}

export function parseNormalizedJobsImport(raw: unknown): ImportPayload {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Import payload must be a JSON object")
  }

  const parsed = raw as Partial<NormalizedJobsImportFile>
  if (!Array.isArray(parsed.companies) || !Array.isArray(parsed.jobs)) {
    throw new Error("Import payload must include companies[] and jobs[] arrays")
  }

  return {
    companies: parsed.companies.map(normalizeCompany),
    jobs: parsed.jobs.map(normalizeJob)
  }
}

export function parseNormalizedJobsImportJson(input: string) {
  let parsed: unknown

  try {
    parsed = JSON.parse(input)
  } catch {
    throw new Error("Import payload is not valid JSON")
  }

  return parseNormalizedJobsImport(parsed)
}

export async function importNormalizedJobs(raw: unknown, options: ImportNormalizedJobsOptions = {}): Promise<ImportNormalizedJobsSummary> {
  const payload = parseNormalizedJobsImport(raw)
  const dryRun = options.dryRun ?? false

  let insertedCompanies = 0
  let updatedCompanies = 0
  let insertedJobs = 0
  let updatedJobs = 0

  try {
    await db.transaction(async (tx) => {
      const companyMap = new Map<string, { id: string; ownerAuthId: string }>()

      for (const company of payload.companies) {
        const [existing] = await tx
          .select({
            id: companies.id,
            ownerAuthId: companies.ownerAuthId
          })
          .from(companies)
          .where(eq(companies.slug, company.slug))
          .limit(1)

        if (existing) {
          await tx
            .update(companies)
            .set({
              name: company.name,
              website: company.website
            })
            .where(eq(companies.id, existing.id))

          companyMap.set(company.slug, { id: existing.id, ownerAuthId: existing.ownerAuthId })
          updatedCompanies += 1
          continue
        }

        const [created] = await tx
          .insert(companies)
          .values({
            slug: company.slug,
            name: company.name,
            ownerAuthId: company.ownerAuthId,
            website: company.website
          })
          .returning({
            id: companies.id,
            ownerAuthId: companies.ownerAuthId
          })

        companyMap.set(company.slug, { id: created.id, ownerAuthId: created.ownerAuthId })
        insertedCompanies += 1
      }

      for (const job of payload.jobs) {
        const company = job.companySlug ? companyMap.get(job.companySlug) : null
        if (job.companySlug && !company) {
          throw new Error(`jobs[${job.slug}] references missing company slug: ${job.companySlug}`)
        }

        const ownerAuthId = company?.ownerAuthId ?? `${job.ownerAuthId}:${job.slug}`
        const values = {
          slug: job.slug,
          title: job.title,
          ownerAuthId,
          companyId: company?.id ?? null,
          location: job.location,
          salary: job.salary,
          workMode: job.workMode,
          employmentType: job.employmentType,
          category: job.category,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryCurrency: job.salaryCurrency,
          salaryInterval: job.salaryInterval,
          description: job.description,
          applyType: job.applyType,
          applyUrl: job.applyUrl,
          isActive: job.isActive,
          listingDurationDays: job.listingDurationDays,
          paymentStatus: job.paymentStatus,
          activatedAt: job.activatedAt,
          expiresAt: job.expiresAt,
          createdAt: job.createdAt
        } as const

        const [existing] = await tx.select({ id: jobs.id }).from(jobs).where(eq(jobs.slug, job.slug)).limit(1)

        if (existing) {
          await tx.update(jobs).set(values).where(eq(jobs.id, existing.id))
          updatedJobs += 1
          continue
        }

        await tx.insert(jobs).values(values)
        insertedJobs += 1
      }

      if (dryRun) {
        throw new DryRunRollback()
      }
    })
  } catch (error) {
    if (!(error instanceof DryRunRollback)) {
      throw error
    }
  }

  return {
    dryRun,
    insertedCompanies,
    updatedCompanies,
    insertedJobs,
    updatedJobs
  }
}
