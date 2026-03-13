import { pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

import { companies } from "./companies"

export const companyClaimRequestStatusEnum = pgEnum("company_claim_request_status", ["pending", "approved", "rejected", "canceled"])

export const companyClaimRequests = pgTable(
  "company_claim_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    requesterAuthId: text("requester_auth_id").notNull(),
    contactEmail: text("contact_email").notNull(),
    message: text("message"),
    status: companyClaimRequestStatusEnum("status").default("pending").notNull(),
    reviewedAt: timestamp("reviewed_at"),
    reviewedByAuthId: text("reviewed_by_auth_id"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => {
    return {
      companyRequesterIdx: uniqueIndex("company_claim_requests_pending_idx")
        .on(table.companyId, table.requesterAuthId)
        .where(sql`${table.status} = 'pending'`)
    }
  }
)
