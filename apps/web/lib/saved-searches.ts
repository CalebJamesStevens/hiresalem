import { and, desc, eq, inArray, isNotNull, isNull, lt, or } from "drizzle-orm"

import { db } from "@/lib/db"
import { canonicalizeJobsSearchPath } from "@/lib/job-search"
import { savedSearches } from "@repo/db/schema/saved-searches"

export type SavedSearch = typeof savedSearches.$inferSelect

type CreateSavedSearchInput = {
  userAuthId: string
  name: string
  queryString: string
  recipientEmail?: string | null
  alertsEnabled?: boolean
}

type UpdateSavedSearchInput = {
  id: string
  userAuthId: string
  name?: string
  recipientEmail?: string | null
  alertsEnabled?: boolean
}

function normalizeSavedSearchName(name: string) {
  const normalized = name.trim()
  if (!normalized) {
    throw new Error("Saved search name is required")
  }

  return normalized
}

function normalizeRecipientEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase() ?? ""
  return normalized.length > 0 ? normalized : null
}

function validateAlerts(recipientEmail: string | null, alertsEnabled: boolean | undefined) {
  if (alertsEnabled && !recipientEmail) {
    throw new Error("Recipient email is required when alerts are enabled")
  }
}

export function getStartOfToday(date = new Date()) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export async function listSavedSearchesForUser(userAuthId: string, limit?: number) {
  const query = db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.userAuthId, userAuthId))
    .orderBy(desc(savedSearches.createdAt))

  return typeof limit === "number" ? query.limit(limit) : query
}

export async function createSavedSearch(input: CreateSavedSearchInput) {
  const name = normalizeSavedSearchName(input.name)
  const queryString = canonicalizeJobsSearchPath(input.queryString)
  const recipientEmail = normalizeRecipientEmail(input.recipientEmail)
  const alertsEnabled = Boolean(input.alertsEnabled)

  validateAlerts(recipientEmail, alertsEnabled)

  const [created] = await db
    .insert(savedSearches)
    .values({
      userAuthId: input.userAuthId,
      name,
      queryString,
      recipientEmail,
      alertsEnabled
    })
    .returning()

  return created
}

export async function updateSavedSearch(input: UpdateSavedSearchInput) {
  const updates: Partial<typeof savedSearches.$inferInsert> = {}

  if (typeof input.name === "string") {
    updates.name = normalizeSavedSearchName(input.name)
  }

  if (input.recipientEmail !== undefined) {
    updates.recipientEmail = normalizeRecipientEmail(input.recipientEmail)
  }

  if (typeof input.alertsEnabled === "boolean") {
    updates.alertsEnabled = input.alertsEnabled
  }

  const nextRecipientEmail = updates.recipientEmail ?? null
  const nextAlertsEnabled = updates.alertsEnabled

  if (nextRecipientEmail !== null || typeof nextAlertsEnabled === "boolean") {
    const [current] = await db
      .select()
      .from(savedSearches)
      .where(and(eq(savedSearches.id, input.id), eq(savedSearches.userAuthId, input.userAuthId)))
      .limit(1)

    if (!current) {
      return null
    }

    validateAlerts(nextRecipientEmail ?? current.recipientEmail, nextAlertsEnabled ?? current.alertsEnabled)
  }

  const [updated] = await db
    .update(savedSearches)
    .set(updates)
    .where(and(eq(savedSearches.id, input.id), eq(savedSearches.userAuthId, input.userAuthId)))
    .returning()

  return updated ?? null
}

export async function deleteSavedSearch(input: { id: string; userAuthId: string }) {
  const [deleted] = await db
    .delete(savedSearches)
    .where(and(eq(savedSearches.id, input.id), eq(savedSearches.userAuthId, input.userAuthId)))
    .returning()

  return deleted ?? null
}

export async function listSavedSearchesReadyForDigest(referenceDate = new Date()) {
  const startOfToday = getStartOfToday(referenceDate)

  return db
    .select()
    .from(savedSearches)
    .where(
      and(
        eq(savedSearches.alertsEnabled, true),
        isNotNull(savedSearches.recipientEmail),
        or(isNull(savedSearches.lastDigestSentAt), lt(savedSearches.lastDigestSentAt, startOfToday))
      )
    )
}

export async function listNeverSentSavedSearchesForDigest() {
  return db.select().from(savedSearches).where(and(eq(savedSearches.alertsEnabled, true), isNotNull(savedSearches.recipientEmail), isNull(savedSearches.lastDigestSentAt)))
}

export async function markSavedSearchDigestsSent(
  updates: Array<{
    id: string
    lastDigestSentAt: Date
    lastDeliveredJobCreatedAt?: Date | null
  }>
) {
  if (updates.length === 0) {
    return
  }

  const targets = await db.select().from(savedSearches).where(inArray(savedSearches.id, updates.map((item) => item.id)))

  await Promise.all(
    targets.map((savedSearch) => {
      const update = updates.find((item) => item.id === savedSearch.id)
      if (!update) {
        return Promise.resolve()
      }

      return db
        .update(savedSearches)
        .set({
          lastDigestSentAt: update.lastDigestSentAt,
          lastDeliveredJobCreatedAt: update.lastDeliveredJobCreatedAt ?? savedSearch.lastDeliveredJobCreatedAt
        })
        .where(eq(savedSearches.id, savedSearch.id))
    })
  )
}
