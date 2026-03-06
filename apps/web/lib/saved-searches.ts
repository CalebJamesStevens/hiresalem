import { and, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { canonicalizeJobsSearchPath } from "@/lib/job-search"
import { savedSearches } from "@repo/db/schema/saved-searches"

export type SavedSearch = typeof savedSearches.$inferSelect

export async function listSavedSearchesForUser(userAuthId: string, limit?: number) {
  const query = db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.userAuthId, userAuthId))
    .orderBy(desc(savedSearches.createdAt))

  return typeof limit === "number" ? query.limit(limit) : query
}

export async function createSavedSearch(input: { userAuthId: string; name: string; queryString: string }) {
  const name = input.name.trim()
  if (!name) {
    throw new Error("Saved search name is required")
  }

  const queryString = canonicalizeJobsSearchPath(input.queryString)

  const [created] = await db
    .insert(savedSearches)
    .values({
      userAuthId: input.userAuthId,
      name,
      queryString
    })
    .returning()

  return created
}

export async function deleteSavedSearch(input: { id: string; userAuthId: string }) {
  const [deleted] = await db
    .delete(savedSearches)
    .where(and(eq(savedSearches.id, input.id), eq(savedSearches.userAuthId, input.userAuthId)))
    .returning()

  return deleted ?? null
}
