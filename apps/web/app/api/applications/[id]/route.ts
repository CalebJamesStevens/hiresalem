import { readFile } from "node:fs/promises"
import path from "node:path"

import { eq } from "drizzle-orm"

import { hasRole } from "@/lib/authz"
import { requireApiRoles } from "@/lib/api-auth"
import { db } from "@/lib/db"
import {
  buildEmployerWorkflowUpdate,
  canManageEmployerApplication,
  getEmployerApplicationOwner,
  parseEmployerWorkflowPatch
} from "@/lib/applicants"
import {
  downloadStoredResume,
  getLegacyResumeContentType,
  getLegacyResumeFilename
} from "@/lib/resume-storage"
import { applications } from "@repo/db/schema/applications"
import { jobs } from "@repo/db/schema/jobs"

type ApplicationRouteContext = {
  params: Promise<{
    id: string
  }>
}

export const runtime = "nodejs"

function buildDownloadHeaders(filename: string, contentType: string, contentLength: number) {
  return {
    "Cache-Control": "private, no-store",
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "Content-Length": String(contentLength),
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff"
  }
}

async function getResumeAccessRow(applicationId: string) {
  const [row] = await db
    .select({
      id: applications.id,
      applicantAuthId: applications.applicantAuthId,
      ownerAuthId: jobs.ownerAuthId,
      resume: applications.resume
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(eq(applications.id, applicationId))
    .limit(1)

  return row ?? null
}

async function getLegacyResumeResponse(relativePath: string) {
  const filename = path.basename(relativePath)
  const absolutePath = path.join(process.cwd(), "public", "uploads", "resumes", filename)
  const buffer = await readFile(absolutePath)

  return new Response(buffer, {
    headers: buildDownloadHeaders(
      getLegacyResumeFilename(relativePath),
      getLegacyResumeContentType(relativePath),
      buffer.byteLength
    )
  })
}

export async function GET(_req: Request, { params }: ApplicationRouteContext) {
  const authResult = await requireApiRoles(["user", "business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const { id } = await params
  const application = await getResumeAccessRow(id)

  if (!application || !application.resume) {
    return Response.json({ error: "Resume not found" }, { status: 404 })
  }

  const isAdmin = hasRole(authResult.user.roles, "admin")
  const canAccess =
    isAdmin || authResult.user.id === application.applicantAuthId || authResult.user.id === application.ownerAuthId

  if (!canAccess) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    if (application.resume.startsWith("/uploads/resumes/")) {
      return await getLegacyResumeResponse(application.resume)
    }

    const storedResume = await downloadStoredResume(application.resume)
    return new Response(Buffer.from(storedResume.body), {
      headers: buildDownloadHeaders(storedResume.filename, storedResume.contentType, storedResume.contentLength)
    })
  } catch (error) {
    const errorName = typeof error === "object" && error !== null && "name" in error ? error.name : null
    const errorCode = typeof error === "object" && error !== null && "code" in error ? error.code : null

    if (errorName === "NoSuchKey" || errorCode === "ENOENT") {
      return Response.json({ error: "Resume not found" }, { status: 404 })
    }

    throw error
  }
}

export async function PATCH(req: Request, { params }: ApplicationRouteContext) {
  const authResult = await requireApiRoles(["business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const { id } = await params
  const parsed = parseEmployerWorkflowPatch(await req.json())

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 })
  }

  const existing = await getEmployerApplicationOwner(id)
  if (!existing) {
    return Response.json({ error: "Application not found" }, { status: 404 })
  }

  const viewer = {
    id: authResult.user.id,
    isAdmin: hasRole(authResult.user.roles, "admin")
  }

  if (!canManageEmployerApplication(viewer, existing.ownerAuthId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const [updated] = await db
    .update(applications)
    .set(buildEmployerWorkflowUpdate(existing.stage, parsed.data))
    .where(eq(applications.id, id))
    .returning()

  return Response.json(updated)
}
