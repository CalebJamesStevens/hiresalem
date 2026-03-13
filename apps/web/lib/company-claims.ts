import { and, asc, desc, eq } from "drizzle-orm"
import { z } from "zod"

import { COMPANY_CLAIM_MESSAGE_MAX_LENGTH, COMPANY_CLAIM_REJECTION_REASON_MAX_LENGTH, getCompanyByOwnerAuthId } from "@/lib/companies"
import { db } from "@/lib/db"
import { companies } from "@repo/db/schema/companies"
import { companyClaimRequests } from "@repo/db/schema/company-claims"

const optionalTrimmedText = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value
    }

    const trimmed = value.trim()
    return trimmed ? trimmed : undefined
  }, z.string().max(max).optional())

const companyClaimInputSchema = z.object({
  contactEmail: z.string().trim().email("invalid_contact_email"),
  message: optionalTrimmedText(COMPANY_CLAIM_MESSAGE_MAX_LENGTH)
})

const claimReviewInputSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: optionalTrimmedText(COMPANY_CLAIM_REJECTION_REASON_MAX_LENGTH)
})

export type CompanyClaimRequest = typeof companyClaimRequests.$inferSelect

export function parseCompanyClaimInput(input: unknown) {
  return companyClaimInputSchema.safeParse(input)
}

export function parseCompanyClaimReviewInput(input: unknown) {
  return claimReviewInputSchema.safeParse(input)
}

export async function getCompanyClaimRequestById(id: string) {
  const [claim] = await db.select().from(companyClaimRequests).where(eq(companyClaimRequests.id, id)).limit(1)
  return claim ?? null
}

export async function getPendingCompanyClaimRequestForUser(companyId: string, requesterAuthId: string) {
  const [claim] = await db
    .select()
    .from(companyClaimRequests)
    .where(
      and(
        eq(companyClaimRequests.companyId, companyId),
        eq(companyClaimRequests.requesterAuthId, requesterAuthId),
        eq(companyClaimRequests.status, "pending")
      )
    )
    .limit(1)

  return claim ?? null
}

export async function createCompanyClaimRequest(input: {
  companyId: string
  requesterAuthId: string
  contactEmail: string
  message?: string | null
}) {
  const existingCompany = await getCompanyByOwnerAuthId(input.requesterAuthId)
  if (existingCompany) {
    throw new Error("already_business_owner")
  }

  const [company] = await db.select().from(companies).where(eq(companies.id, input.companyId)).limit(1)
  if (!company) {
    throw new Error("company_not_found")
  }

  if (company.claimedAt) {
    throw new Error("already_claimed")
  }

  const existingRequest = await getPendingCompanyClaimRequestForUser(input.companyId, input.requesterAuthId)
  if (existingRequest) {
    throw new Error("request_exists")
  }

  const [created] = await db
    .insert(companyClaimRequests)
    .values({
      companyId: input.companyId,
      requesterAuthId: input.requesterAuthId,
      contactEmail: input.contactEmail.trim().toLowerCase(),
      message: input.message?.trim() || null
    })
    .returning()

  return created
}

export async function listPendingCompanyClaimRequests() {
  return db
    .select({
      id: companyClaimRequests.id,
      companyId: companyClaimRequests.companyId,
      requesterAuthId: companyClaimRequests.requesterAuthId,
      contactEmail: companyClaimRequests.contactEmail,
      message: companyClaimRequests.message,
      status: companyClaimRequests.status,
      createdAt: companyClaimRequests.createdAt,
      companyName: companies.name,
      companySlug: companies.slug,
      companyClaimedAt: companies.claimedAt
    })
    .from(companyClaimRequests)
    .innerJoin(companies, eq(companyClaimRequests.companyId, companies.id))
    .where(eq(companyClaimRequests.status, "pending"))
    .orderBy(asc(companyClaimRequests.createdAt))
}

export async function approveCompanyClaimRequest(input: { id: string; reviewerAuthId: string }) {
  return db.transaction(async (tx) => {
    const [claim] = await tx.select().from(companyClaimRequests).where(eq(companyClaimRequests.id, input.id)).limit(1)
    if (!claim) {
      throw new Error("claim_not_found")
    }

    if (claim.status !== "pending") {
      throw new Error("claim_not_pending")
    }

    const [company] = await tx.select().from(companies).where(eq(companies.id, claim.companyId)).limit(1)
    if (!company) {
      throw new Error("company_not_found")
    }

    if (company.claimedAt) {
      throw new Error("already_claimed")
    }

    const existingCompany = await getCompanyByOwnerAuthId(claim.requesterAuthId)
    if (existingCompany) {
      throw new Error("requester_already_has_company")
    }

    const [updatedCompany] = await tx
      .update(companies)
      .set({
        ownerAuthId: claim.requesterAuthId,
        claimedAt: new Date()
      })
      .where(eq(companies.id, company.id))
      .returning()

    const [updatedClaim] = await tx
      .update(companyClaimRequests)
      .set({
        status: "approved",
        reviewedAt: new Date(),
        reviewedByAuthId: input.reviewerAuthId,
        rejectionReason: null
      })
      .where(eq(companyClaimRequests.id, claim.id))
      .returning()

    return {
      claim: updatedClaim ?? claim,
      company: updatedCompany ?? company
    }
  })
}

export async function rejectCompanyClaimRequest(input: { id: string; reviewerAuthId: string; rejectionReason?: string | null }) {
  const [existing] = await db.select().from(companyClaimRequests).where(eq(companyClaimRequests.id, input.id)).limit(1)
  if (!existing) {
    throw new Error("claim_not_found")
  }

  if (existing.status !== "pending") {
    throw new Error("claim_not_pending")
  }

  const [updated] = await db
    .update(companyClaimRequests)
    .set({
      status: "rejected",
      reviewedAt: new Date(),
      reviewedByAuthId: input.reviewerAuthId,
      rejectionReason: input.rejectionReason?.trim() || null
    })
    .where(eq(companyClaimRequests.id, input.id))
    .returning()

  return updated ?? existing
}

export async function listRecentCompanyClaimRequests(limit = 20) {
  return db
    .select({
      id: companyClaimRequests.id,
      companyId: companyClaimRequests.companyId,
      requesterAuthId: companyClaimRequests.requesterAuthId,
      contactEmail: companyClaimRequests.contactEmail,
      message: companyClaimRequests.message,
      status: companyClaimRequests.status,
      reviewedAt: companyClaimRequests.reviewedAt,
      reviewedByAuthId: companyClaimRequests.reviewedByAuthId,
      rejectionReason: companyClaimRequests.rejectionReason,
      createdAt: companyClaimRequests.createdAt,
      companyName: companies.name,
      companySlug: companies.slug
    })
    .from(companyClaimRequests)
    .innerJoin(companies, eq(companyClaimRequests.companyId, companies.id))
    .orderBy(desc(companyClaimRequests.createdAt))
    .limit(limit)
}
