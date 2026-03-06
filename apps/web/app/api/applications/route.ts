import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { requireApiRoles } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { getRequestKey } from "@/lib/request"
import { applications } from "@repo/db/schema/applications"
import { jobs } from "@repo/db/schema/jobs"

export const runtime = "nodejs"

const optionalUrlSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}, z.string().url().optional())

const createApplicationSchema = z.object({
  jobId: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().trim().max(40).optional(),
  location: z.string().trim().max(120).optional(),
  linkedinUrl: optionalUrlSchema,
  portfolioUrl: optionalUrlSchema,
  coverLetter: z.string().trim().max(3000).optional(),
  website: z.string().optional()
})

const MAX_RESUME_BYTES = 5 * 1024 * 1024
const allowedResumeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
])
const allowedResumeExtensions = new Set([".pdf", ".doc", ".docx"])

function cleanOptionalText(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function getStringEntry(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

function validateResumeFile(file: File | null) {
  if (!file || file.size === 0) {
    return { ok: true as const, file: null }
  }

  const extension = path.extname(file.name).toLowerCase()
  if (!allowedResumeExtensions.has(extension)) {
    return { ok: false as const, error: "Resume must be a PDF, DOC, or DOCX file." }
  }

  if (file.type && !allowedResumeTypes.has(file.type)) {
    return { ok: false as const, error: "Resume must be a PDF, DOC, or DOCX file." }
  }

  if (file.size > MAX_RESUME_BYTES) {
    return { ok: false as const, error: "Resume must be 5 MB or smaller." }
  }

  return { ok: true as const, file }
}

async function saveResumeFile(file: File) {
  const extension = path.extname(file.name).toLowerCase()
  const filename = `${crypto.randomUUID()}${extension}`
  const relativePath = `/uploads/resumes/${filename}`
  const absolutePath = path.join(process.cwd(), "public", "uploads", "resumes", filename)

  await mkdir(path.dirname(absolutePath), { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(absolutePath, buffer)

  return relativePath
}

export async function POST(req: Request) {
  const authResult = await requireApiRoles(["user", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const rate = checkRateLimit("applications:create", getRequestKey(req, authResult.user.id), 20, 60 * 60 * 1000)
  if (!rate.ok) {
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  const formData = await req.formData()
  const parsed = createApplicationSchema.safeParse({
    jobId: getStringEntry(formData, "jobId"),
    name: getStringEntry(formData, "name"),
    email: getStringEntry(formData, "email"),
    phone: getStringEntry(formData, "phone"),
    location: getStringEntry(formData, "location"),
    linkedinUrl: getStringEntry(formData, "linkedinUrl"),
    portfolioUrl: getStringEntry(formData, "portfolioUrl"),
    coverLetter: getStringEntry(formData, "coverLetter"),
    website: getStringEntry(formData, "website")
  })
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 })
  }

  const resumeEntry = formData.get("resume")
  const resumeFile = resumeEntry instanceof File ? resumeEntry : null
  const resumeValidation = validateResumeFile(resumeFile)
  if (!resumeValidation.ok) {
    return Response.json({ error: resumeValidation.error }, { status: 400 })
  }

  if (parsed.data.website?.trim()) {
    return Response.json({ error: "Spam detected" }, { status: 400 })
  }

  const [job] = await db.select().from(jobs).where(eq(jobs.id, parsed.data.jobId)).limit(1)

  if (!job || !job.isActive) {
    return Response.json({ error: "This job is not accepting applications" }, { status: 400 })
  }

  if (job.applyType !== "onsite") {
    return Response.json({ error: "This job accepts applications externally" }, { status: 400 })
  }

  const [existing] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(and(eq(applications.jobId, parsed.data.jobId), eq(applications.applicantAuthId, authResult.user.id)))
    .limit(1)

  if (existing) {
    return Response.json({ error: "You already applied to this role. You can review it in your dashboard." }, { status: 409 })
  }

  let storedResumePath: string | null = null

  try {
    if (resumeValidation.file) {
      storedResumePath = await saveResumeFile(resumeValidation.file)
    }

    const [created] = await db
      .insert(applications)
      .values({
        jobId: parsed.data.jobId,
        applicantAuthId: authResult.user.id,
        name: parsed.data.name.trim(),
        email: parsed.data.email.trim(),
        phone: cleanOptionalText(parsed.data.phone),
        location: cleanOptionalText(parsed.data.location),
        resume: storedResumePath,
        linkedinUrl: cleanOptionalText(parsed.data.linkedinUrl),
        portfolioUrl: cleanOptionalText(parsed.data.portfolioUrl),
        coverLetter: cleanOptionalText(parsed.data.coverLetter)
      })
      .returning()

    return Response.json(created, { status: 201 })
  } catch (error) {
    if (storedResumePath) {
      await unlink(path.join(process.cwd(), "public", storedResumePath.slice(1))).catch(() => undefined)
    }

    const errorCode = typeof error === "object" && error !== null && "code" in error ? error.code : null
    if (errorCode === "23505") {
      return Response.json({ error: "You already applied to this role. You can review it in your dashboard." }, { status: 409 })
    }

    throw error
  }
}
