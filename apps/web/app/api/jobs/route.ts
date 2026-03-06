import { desc, eq } from "drizzle-orm"
import { z } from "zod"

import { hasRole, normalizeRoles } from "@/lib/authz"
import { getCompanyByOwnerAuthId } from "@/lib/companies"
import { getSessionSafe } from "@/lib/session"
import { requireApiRoles } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { getRequestKey } from "@/lib/request"
import { employmentTypeEnum, jobCategoryEnum, jobs, salaryIntervalEnum, workModeEnum } from "@repo/db/schema/jobs"

const optionalUrlSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}, z.string().url().optional())

const optionalNumberSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim()) {
    return Number.parseInt(value.trim(), 10)
  }

  if (typeof value === "number") {
    return value
  }

  return undefined
}, z.number().int().positive().optional())

const createJobSchema = z
  .object({
    title: z.string().min(2),
    slug: z.string().optional(),
    location: z.string().optional(),
    salary: z.string().optional(),
    workMode: z.enum(workModeEnum.enumValues).optional(),
    employmentType: z.enum(employmentTypeEnum.enumValues).optional(),
    category: z.enum(jobCategoryEnum.enumValues).optional(),
    salaryMin: optionalNumberSchema,
    salaryMax: optionalNumberSchema,
    salaryCurrency: z.string().trim().min(3).max(3).optional(),
    salaryInterval: z.enum(salaryIntervalEnum.enumValues).optional(),
    description: z.string().optional(),
    applyType: z.enum(["onsite", "external"]).default("onsite"),
    applyUrl: optionalUrlSchema,
    companyId: z.string().uuid().optional(),
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
  })

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

function cleanOptionalText(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function cleanOptionalCurrency(value: string | undefined) {
  const trimmed = value?.trim().toUpperCase()
  return trimmed ? trimmed : null
}

export async function GET() {
  const session = await getSessionSafe()
  const roles = normalizeRoles(session?.user?.roles)
  const isAdmin = hasRole(roles, "admin")

  const data = isAdmin
    ? await db.select().from(jobs).orderBy(desc(jobs.createdAt))
    : await db.select().from(jobs).where(eq(jobs.isActive, true)).orderBy(desc(jobs.createdAt))

  return Response.json(data)
}

export async function POST(req: Request) {
  const authResult = await requireApiRoles(["business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const isAdmin = hasRole(authResult.user.roles, "admin")

  const rate = checkRateLimit("jobs:create", getRequestKey(req, authResult.user.id), 5, 60 * 60 * 1000)
  if (!rate.ok) {
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  const parsed = createJobSchema.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 })
  }

  if (parsed.data.website?.trim()) {
    return Response.json({ error: "Spam detected" }, { status: 400 })
  }

  const title = parsed.data.title.trim()
  const baseSlug = toSlug(parsed.data.slug ?? title) || "job"
  const slug = parsed.data.slug ? baseSlug : `${baseSlug}-${Date.now().toString(36)}`
  const ownerCompany = isAdmin ? null : await getCompanyByOwnerAuthId(authResult.user.id)

  if (!isAdmin && !ownerCompany) {
    return Response.json({ error: "Complete business setup before posting a job." }, { status: 400 })
  }

  const [created] = await db
    .insert(jobs)
    .values({
      title,
      slug,
      ownerAuthId: authResult.user.id,
      companyId: ownerCompany?.id ?? parsed.data.companyId ?? null,
      location: cleanOptionalText(parsed.data.location),
      salary: cleanOptionalText(parsed.data.salary),
      workMode: parsed.data.workMode ?? null,
      employmentType: parsed.data.employmentType ?? null,
      category: parsed.data.category ?? null,
      salaryMin: parsed.data.salaryMin ?? null,
      salaryMax: parsed.data.salaryMax ?? null,
      salaryCurrency: cleanOptionalCurrency(parsed.data.salaryCurrency) ?? (parsed.data.salaryMin || parsed.data.salaryMax ? "USD" : null),
      salaryInterval: parsed.data.salaryInterval ?? null,
      description: cleanOptionalText(parsed.data.description),
      applyType: parsed.data.applyType,
      applyUrl: parsed.data.applyType === "external" ? cleanOptionalText(parsed.data.applyUrl) : null,
      isActive: true
    })
    .returning()

  return Response.json(created, { status: 201 })
}
