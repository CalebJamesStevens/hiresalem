import { asc, eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/lib/db"
import { snippet } from "@/lib/seo"
import { companyPlanIds, type CompanyPlanId } from "@repo/db/plans"
import { companies } from "@repo/db/schema/companies"

export type Company = typeof companies.$inferSelect
export type CompanyProfileViewer = {
  id: string
  isAdmin: boolean
}

export const COMPANY_NAME_MAX_LENGTH = 80
export const COMPANY_LOGO_URL_MAX_LENGTH = 500
export const COMPANY_SHORT_DESCRIPTION_MAX_LENGTH = 280
export const COMPANY_LOCATION_MAX_LENGTH = 120
export const COMPANY_WEBSITE_MAX_LENGTH = 500
export const COMPANY_PLAN_OVERRIDE_REASON_MAX_LENGTH = 500

const optionalProfileTextField = (max: number, message: string) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value
    }

    const trimmed = value.trim()
    return trimmed ? trimmed : undefined
  }, z.string().max(max, message).optional())

const optionalProfileUrlField = (max: number, message: string) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value
    }

    const trimmed = value.trim()
    return trimmed ? trimmed : undefined
  }, z.string().max(max, message).url(message).optional())

const companyProfileInputSchema = z.object({
  name: z.string().trim().min(2, "company_name_length").max(COMPANY_NAME_MAX_LENGTH, "company_name_length"),
  logoUrl: optionalProfileUrlField(COMPANY_LOGO_URL_MAX_LENGTH, "invalid_logo_url"),
  shortDescription: optionalProfileTextField(COMPANY_SHORT_DESCRIPTION_MAX_LENGTH, "short_description_length"),
  website: optionalProfileUrlField(COMPANY_WEBSITE_MAX_LENGTH, "invalid_website"),
  location: optionalProfileTextField(COMPANY_LOCATION_MAX_LENGTH, "company_location_length")
})

const companyPlanInputSchema = z.object({
  plan: z.enum(companyPlanIds, {
    message: "invalid_company_plan"
  }),
  planOverride: z.preprocess((value) => {
    if (typeof value !== "string") {
      return undefined
    }

    const trimmed = value.trim()
    return trimmed ? trimmed : undefined
  }, z.enum(companyPlanIds, { message: "invalid_company_plan" }).optional()),
  planOverrideReason: optionalProfileTextField(COMPANY_PLAN_OVERRIDE_REASON_MAX_LENGTH, "plan_override_reason_length")
})

export type CompanyProfileInput = {
  name: string
  logoUrl: string | null
  shortDescription: string | null
  website: string | null
  location: string | null
}

export type CompanyProfileValidationErrorCode =
  | "company_name_length"
  | "invalid_logo_url"
  | "short_description_length"
  | "invalid_website"
  | "company_location_length"
  | "invalid_company_profile"

export type CompanyPlanValidationErrorCode = "invalid_company_plan" | "plan_override_reason_length" | "invalid_company_plan_update"

export function toCompanySlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export async function getCompanyByOwnerAuthId(ownerAuthId: string) {
  const [company] = await db.select().from(companies).where(eq(companies.ownerAuthId, ownerAuthId)).limit(1)
  return company ?? null
}

export async function getCompanyBySlug(slug: string) {
  const [company] = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1)
  return company ?? null
}

export async function getCompanyById(id: string) {
  const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1)
  return company ?? null
}

export async function listCompanies() {
  return db
    .select({
      id: companies.id,
      name: companies.name,
      slug: companies.slug,
      logoUrl: companies.logoUrl,
      shortDescription: companies.shortDescription,
      website: companies.website,
      location: companies.location,
      plan: companies.plan,
      planOverride: companies.planOverride
    })
    .from(companies)
    .orderBy(asc(companies.name), asc(companies.slug))
}

export async function createUniqueCompanySlug(name: string) {
  const baseSlug = toCompanySlug(name) || "company"
  let slug = baseSlug
  let suffix = 1

  for (;;) {
    const existing = await getCompanyBySlug(slug)
    if (!existing) {
      return slug
    }

    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }
}

export function normalizeCompanyWebsite(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  try {
    return new URL(trimmed).toString()
  } catch {
    return null
  }
}

export function parseCompanyProfileInput(input: unknown) {
  const result = companyProfileInputSchema.safeParse(input)

  if (!result.success) {
    return result
  }

  return {
    success: true as const,
    data: {
      name: result.data.name.trim(),
      logoUrl: result.data.logoUrl ?? null,
      shortDescription: result.data.shortDescription ?? null,
      website: result.data.website ?? null,
      location: result.data.location ?? null
    }
  }
}

export function getCompanyProfileValidationErrorCode(error: z.ZodError): CompanyProfileValidationErrorCode {
  const code = error.issues[0]?.message

  if (
    code === "company_name_length" ||
    code === "invalid_logo_url" ||
    code === "short_description_length" ||
    code === "invalid_website" ||
    code === "company_location_length"
  ) {
    return code
  }

  return "invalid_company_profile"
}

export function parseCompanyPlanInput(input: unknown) {
  const result = companyPlanInputSchema.safeParse(input)

  if (!result.success) {
    return result
  }

  const normalizedPlanOverride = result.data.planOverride && result.data.planOverride !== result.data.plan ? result.data.planOverride : null

  return {
    success: true as const,
    data: {
      plan: result.data.plan,
      planOverride: normalizedPlanOverride,
      planOverrideReason: result.data.planOverrideReason ?? null
    }
  }
}

export function getCompanyPlanValidationErrorCode(error: z.ZodError): CompanyPlanValidationErrorCode {
  const code = error.issues[0]?.message

  if (code === "invalid_company_plan" || code === "plan_override_reason_length") {
    return code
  }

  return "invalid_company_plan_update"
}

export function canManageCompanyProfile(viewer: CompanyProfileViewer, ownerAuthId: string) {
  return viewer.isAdmin || viewer.id === ownerAuthId
}

export function getCompanyProfileInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "HS"
}

export function buildCompanyProfilePageDescription(input: {
  name: string
  shortDescription?: string | null
  location?: string | null
  activeJobCount: number
}) {
  const description = input.shortDescription?.trim()
  const location = input.location?.trim()
  const activity =
    input.activeJobCount > 0
      ? `${input.name} currently has ${input.activeJobCount} active ${input.activeJobCount === 1 ? "job" : "jobs"} on HireSalem.`
      : `${input.name} is listed on HireSalem. Check back for new Salem-area openings from this employer.`

  const source = [description, location ? `Based in ${location}.` : null, activity].filter(Boolean).join(" ")

  return snippet(source, `${input.name} company profile on HireSalem.`, 155)
}

export async function updateCompanyProfile(input: {
  id: string
  name: string
  logoUrl: string | null
  shortDescription: string | null
  website: string | null
  location: string | null
}) {
  const [updated] = await db
    .update(companies)
    .set({
      name: input.name,
      logoUrl: input.logoUrl,
      shortDescription: input.shortDescription,
      website: input.website,
      location: input.location
    })
    .where(eq(companies.id, input.id))
    .returning()

  return updated ?? null
}

export async function updateCompanyPlanAssignment(input: {
  id: string
  plan: CompanyPlanId
  planOverride: CompanyPlanId | null
  planOverrideReason: string | null
}) {
  const [updated] = await db
    .update(companies)
    .set({
      plan: input.plan,
      planOverride: input.planOverride,
      planOverrideReason: input.planOverrideReason,
      planAssignedAt: new Date()
    })
    .where(eq(companies.id, input.id))
    .returning()

  return updated ?? null
}
