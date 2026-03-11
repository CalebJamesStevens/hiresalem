import { eq } from "drizzle-orm"
import { z } from "zod"

import { hasRole, normalizeRoles } from "@/lib/authz"
import { getJobStatusLabel, isJobExpired, isJobPublished } from "@/lib/job-listing-billing"
import { buildJobWriteValues, calculateJobExpiration, jobWriteSchema, resolveCompanyForJob } from "@/lib/job-write"
import { getSessionSafe } from "@/lib/session"
import { requireApiRoles } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { syncGoogleIndexingForJobTransition } from "@/lib/job-indexing"
import { jobs } from "@repo/db/schema/jobs"

const updateJobSchema = z.object({
  isActive: z.boolean()
})

type JobRouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_req: Request, { params }: JobRouteContext) {
  const { id } = await params
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1)

  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 })
  }

  if (isJobPublished(job)) {
    return Response.json(job)
  }

  const session = await getSessionSafe()
  const userId = session?.user?.id
  const roles = normalizeRoles(session?.user?.roles)
  const isAdmin = hasRole(roles, "admin")

  if (!userId || (!isAdmin && job.ownerAuthId !== userId)) {
    return Response.json({ error: "Job not found" }, { status: 404 })
  }

  return Response.json(job)
}

export async function PATCH(req: Request, { params }: JobRouteContext) {
  const authResult = await requireApiRoles(["business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const { id } = await params
  const parsed = updateJobSchema.safeParse(await req.json())

  if (!parsed.success) {
    return Response.json({ error: "Invalid payload" }, { status: 400 })
  }

  const [existing] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1)

  if (!existing) {
    return Response.json({ error: "Job not found" }, { status: 404 })
  }

  const isAdmin = hasRole(authResult.user.roles, "admin")
  if (!isAdmin && existing.ownerAuthId !== authResult.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  if (parsed.data.isActive) {
    if (existing.paymentStatus !== "paid") {
      return Response.json({ error: `This listing cannot be reopened: ${getJobStatusLabel(existing).toLowerCase()}.` }, { status: 400 })
    }

    if (isJobExpired(existing)) {
      return Response.json({ error: "This listing has expired. Create a new paid listing to publish it again." }, { status: 400 })
    }
  }

  const [updated] = await db
    .update(jobs)
    .set({ isActive: parsed.data.isActive })
    .where(eq(jobs.id, id))
    .returning()

  await syncGoogleIndexingForJobTransition({
    before: existing,
    after: updated ?? existing
  })

  return Response.json(updated)
}

export async function PUT(req: Request, { params }: JobRouteContext) {
  const authResult = await requireApiRoles(["business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const { id } = await params
  const parsed = jobWriteSchema.safeParse(await req.json())

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 })
  }

  if (parsed.data.website?.trim()) {
    return Response.json({ error: "Spam detected" }, { status: 400 })
  }

  const [existing] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1)

  if (!existing) {
    return Response.json({ error: "Job not found" }, { status: 404 })
  }

  const isAdmin = hasRole(authResult.user.roles, "admin")
  if (!isAdmin && existing.ownerAuthId !== authResult.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  let companyForJob

  try {
    companyForJob = await resolveCompanyForJob(parsed.data, authResult.user.id, isAdmin)
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to resolve company." }, { status: 400 })
  }

  if (!isAdmin && !companyForJob) {
    return Response.json({ error: "Complete business setup before editing a job." }, { status: 400 })
  }

  const nextValues = buildJobWriteValues(parsed.data, companyForJob?.id ?? null)
  const shouldRecalculateExpiration = Boolean(existing.activatedAt)
  const [updated] = await db
    .update(jobs)
    .set({
      ...nextValues,
      listingDurationDays: existing.listingDurationDays,
      expiresAt: shouldRecalculateExpiration && existing.activatedAt ? calculateJobExpiration(existing.activatedAt, existing.listingDurationDays) : existing.expiresAt
    })
    .where(eq(jobs.id, id))
    .returning()

  await syncGoogleIndexingForJobTransition({
    before: existing,
    after: updated ?? existing
  })

  return Response.json(updated)
}

export async function DELETE(_req: Request, { params }: JobRouteContext) {
  const authResult = await requireApiRoles(["business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const { id } = await params
  const [existing] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1)

  if (!existing) {
    return Response.json({ error: "Job not found" }, { status: 404 })
  }

  const isAdmin = hasRole(authResult.user.roles, "admin")
  if (!isAdmin && existing.ownerAuthId !== authResult.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  await db.delete(jobs).where(eq(jobs.id, id))

  await syncGoogleIndexingForJobTransition({
    before: existing,
    after: null
  })

  return Response.json({ ok: true })
}
