import { z } from "zod"

import { requireApiRoles } from "@/lib/api-auth"
import { createSavedJob, listSavedJobsForUser } from "@/lib/saved-jobs"

const createSavedJobSchema = z.object({
  jobId: z.string().uuid()
})

export async function GET() {
  const authResult = await requireApiRoles(["user", "business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const data = await listSavedJobsForUser(authResult.user.id)
  return Response.json(data)
}

export async function POST(request: Request) {
  const authResult = await requireApiRoles(["user", "business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  if (!authResult.user.email) {
    return Response.json({ error: "Account email is required to save jobs." }, { status: 400 })
  }

  const parsed = createSavedJobSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 })
  }

  try {
    const savedJob = await createSavedJob({
      userAuthId: authResult.user.id,
      recipientEmail: authResult.user.email,
      jobId: parsed.data.jobId
    })

    return Response.json(savedJob, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save job"

    if (message === "job_not_found") {
      return Response.json({ error: "Job not found" }, { status: 404 })
    }

    return Response.json({ error: "Unable to save job" }, { status: 400 })
  }
}
