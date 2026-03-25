import { z } from "zod"

import { calculateJobListingPrice, JOB_LISTING_DEFAULT_DAYS, JOB_LISTING_MAX_DAYS, JOB_LISTING_MIN_DAYS } from "@/lib/job-listing-billing"
import { createUniqueCompanySlug, getCompanyById, getCompanyByOwnerAuthId, getCompanyBySlug, toCompanySlug } from "@/lib/companies"
import { db } from "@/lib/db"
import type { ResolvedCompanyPlan } from "@repo/db/plans"
import { companies } from "@repo/db/schema/companies"
import { employmentTypeEnum, jobCategoryEnum, jobs, salaryIntervalEnum, workModeEnum } from "@repo/db/schema/jobs"

const optionalUrlSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}, z.string().url().optional())

const optionalPositiveNumberSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim()) {
    return Number(value.trim())
  }

  if (typeof value === "number") {
    return value
  }

  return undefined
}, z.number().finite().positive().optional())

const optionalTrimmedStringSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}, z.string().min(2).optional())

const listingDurationSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim()) {
    return Number.parseInt(value.trim(), 10)
  }

  if (typeof value === "number") {
    return value
  }

  return JOB_LISTING_DEFAULT_DAYS
}, z.number().int().min(JOB_LISTING_MIN_DAYS).max(JOB_LISTING_MAX_DAYS))

const featuredBooleanSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    return value === "true" || value === "on"
  }

  return value
}, z.boolean().default(false))

export const jobWriteSchema = z
  .object({
    title: z.string().min(2),
    slug: z.string().optional(),
    location: z.string().optional(),
    jobLocationCity: z.string().trim().min(2).max(120).optional(),
    jobLocationRegion: z.string().trim().min(2).max(120).optional(),
    jobLocationCountry: z.string().trim().min(2).max(2).optional(),
    streetAddress: z.string().trim().min(2).max(200).optional(),
    postalCode: z.string().trim().min(3).max(16).optional(),
    salary: z.string().optional(),
    workMode: z.enum(workModeEnum.enumValues).optional(),
    employmentType: z.enum(employmentTypeEnum.enumValues).optional(),
    category: z.enum(jobCategoryEnum.enumValues).optional(),
    salaryMin: optionalPositiveNumberSchema,
    salaryMax: optionalPositiveNumberSchema,
    salaryCurrency: z.string().trim().min(3).max(3).optional(),
    salaryInterval: z.enum(salaryIntervalEnum.enumValues).optional(),
    description: z.string().optional(),
    applyType: z.enum(["onsite", "external"]).default("onsite"),
    applyUrl: optionalUrlSchema,
    isFeatured: featuredBooleanSchema,
    listingDurationDays: listingDurationSchema,
    companyId: z.string().uuid().optional(),
    newCompanyName: optionalTrimmedStringSchema,
    newCompanyWebsite: optionalUrlSchema,
    website: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (value.applyType === "external" && !value.applyUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["applyUrl"],
        message: "External apply URL is required for external jobs"
      })
    }

    if (value.salaryMin && value.salaryMax && value.salaryMin > value.salaryMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salaryMax"],
        message: "Maximum salary must be greater than minimum salary"
      })
    }

    if (value.companyId && value.newCompanyName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["companyId"],
        message: "Choose an existing company or add a new one, not both"
      })
    }
  })

export type JobWriteInput = z.infer<typeof jobWriteSchema>
export type PersistedJob = typeof jobs.$inferSelect

export type JobPublicationValidationReason =
  | "missing_company"
  | "missing_description"
  | "missing_job_location_city"
  | "missing_job_location_region"
  | "missing_job_location_country"

export function getJobPublicationValidationReasons(input: {
  companyId: string | null
  description?: string | null
  workMode?: (typeof workModeEnum.enumValues)[number] | null
  jobLocationCity?: string | null
  jobLocationRegion?: string | null
  jobLocationCountry?: string | null
}) {
  const reasons: JobPublicationValidationReason[] = []

  if (!input.companyId) {
    reasons.push("missing_company")
  }

  if (!cleanOptionalText(input.description ?? undefined)) {
    reasons.push("missing_description")
  }

  if (input.workMode !== "remote") {
    if (!cleanOptionalText(input.jobLocationCity ?? undefined)) {
      reasons.push("missing_job_location_city")
    }

    if (!cleanOptionalText(input.jobLocationRegion ?? undefined)) {
      reasons.push("missing_job_location_region")
    }

    if (!cleanOptionalText(input.jobLocationCountry ?? undefined)) {
      reasons.push("missing_job_location_country")
    }
  }

  return reasons
}

export function getJobPublicationValidationMessage(reasons: JobPublicationValidationReason[]) {
  if (reasons.length === 0) {
    return null
  }

  const messageMap: Record<JobPublicationValidationReason, string> = {
    missing_company: "Select or create a company before publishing this job.",
    missing_description: "Add a job description before publishing this job.",
    missing_job_location_city: "Add a schema job-location city before publishing this non-remote job.",
    missing_job_location_region: "Add a schema job-location region before publishing this non-remote job.",
    missing_job_location_country: "Add a schema job-location country before publishing this non-remote job."
  }

  return reasons.map((reason) => messageMap[reason]).join(" ")
}

export function toJobSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export function cleanOptionalText(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function cleanOptionalCurrency(value: string | undefined) {
  const trimmed = value?.trim().toUpperCase()
  return trimmed ? trimmed : null
}

export async function resolveCompanyForJob(input: JobWriteInput, ownerAuthId: string, isAdmin: boolean) {
  if (!isAdmin) {
    return getCompanyByOwnerAuthId(ownerAuthId)
  }

  if (input.companyId) {
    const company = await getCompanyById(input.companyId)
    if (!company) {
      throw new Error("Selected company does not exist.")
    }

    return company
  }

  const newCompanyName = cleanOptionalText(input.newCompanyName)
  if (!newCompanyName) {
    return null
  }

  const slugCandidate = toCompanySlug(newCompanyName) || "company"
  const existingCompany = await getCompanyBySlug(slugCandidate)
  if (existingCompany) {
    return existingCompany
  }

  const slug = await createUniqueCompanySlug(newCompanyName)
  const [createdCompany] = await db
    .insert(companies)
    .values({
      name: newCompanyName,
      slug,
      ownerAuthId: `${ownerAuthId}:company:${slug}`,
      website: cleanOptionalText(input.newCompanyWebsite)
    })
    .returning()

  return createdCompany
}

export function buildJobWriteValues(input: JobWriteInput, companyId: string | null) {
  return {
    title: input.title.trim(),
    companyId,
    location: cleanOptionalText(input.location),
    jobLocationCity: cleanOptionalText(input.jobLocationCity),
    jobLocationRegion: cleanOptionalText(input.jobLocationRegion)?.toUpperCase() ?? null,
    jobLocationCountry: cleanOptionalText(input.jobLocationCountry)?.toUpperCase() ?? null,
    streetAddress: cleanOptionalText(input.streetAddress),
    postalCode: cleanOptionalText(input.postalCode),
    salary: cleanOptionalText(input.salary),
    workMode: input.workMode ?? null,
    employmentType: input.employmentType ?? null,
    category: input.category ?? null,
    salaryMin: input.salaryMin ?? null,
    salaryMax: input.salaryMax ?? null,
    salaryCurrency: cleanOptionalCurrency(input.salaryCurrency) ?? (input.salaryMin || input.salaryMax ? "USD" : null),
    salaryInterval: input.salaryInterval ?? null,
    description: cleanOptionalText(input.description),
    applyType: input.applyType,
    applyUrl: input.applyType === "external" ? cleanOptionalText(input.applyUrl) : null,
    isFeatured: input.isFeatured
  } as const
}

export function buildCheckoutDescription(title: string, companyName: string | null) {
  return `${title} for ${companyName ?? "your company"}`
}

export function calculateJobExpiration(startedAt: Date, listingDurationDays: number) {
  return new Date(startedAt.getTime() + listingDurationDays * 24 * 60 * 60 * 1000)
}

export function getPlanListingDurationDays(
  requestedListingDurationDays: number,
  plan?: Pick<ResolvedCompanyPlan, "entitlements"> | null
) {
  return plan?.entitlements.jobExpiresAfterDays ?? requestedListingDurationDays
}

export function getPlanJobExpiration(
  startedAt: Date,
  requestedListingDurationDays: number,
  plan?: Pick<ResolvedCompanyPlan, "entitlements"> | null
) {
  const effectiveDurationDays = getPlanListingDurationDays(requestedListingDurationDays, plan)

  if (plan?.entitlements.jobExpiresAfterDays === null) {
    return null
  }

  return calculateJobExpiration(startedAt, effectiveDurationDays)
}

export { calculateJobListingPrice }
