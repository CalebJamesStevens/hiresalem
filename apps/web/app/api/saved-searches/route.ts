import { z } from "zod"

import { requireApiRoles } from "@/lib/api-auth"
import { createSavedSearch, listSavedSearchesForUser } from "@/lib/saved-searches"

const createSavedSearchSchema = z.object({
  name: z.string().min(1).max(80),
  queryString: z.string().min(1)
})

export async function GET() {
  const authResult = await requireApiRoles(["user", "business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const data = await listSavedSearchesForUser(authResult.user.id)
  return Response.json(data)
}

export async function POST(req: Request) {
  const authResult = await requireApiRoles(["user", "business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const parsed = createSavedSearchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 })
  }

  try {
    const created = await createSavedSearch({
      userAuthId: authResult.user.id,
      name: parsed.data.name,
      queryString: parsed.data.queryString
    })

    return Response.json(created, { status: 201 })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create saved search" },
      { status: 400 }
    )
  }
}
