import { asc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { companies } from "@repo/db/schema/companies"

export type Company = typeof companies.$inferSelect

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
      website: companies.website
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

export async function updateCompanyProfile(input: {
  id: string
  name: string
  website: string | null
}) {
  const [updated] = await db
    .update(companies)
    .set({
      name: input.name,
      website: input.website
    })
    .where(eq(companies.id, input.id))
    .returning()

  return updated ?? null
}
