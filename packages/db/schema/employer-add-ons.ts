import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { companies } from "./companies"
import { jobs } from "./jobs"

export const employerAddOnTypeEnum = pgEnum("employer_add_on_type", ["extra_slot", "weekly_feature", "social_shoutout"])
export const employerAddOnStatusEnum = pgEnum("employer_add_on_status", ["pending", "paid", "canceled"])

export const employerAddOnPurchases = pgTable("employer_add_on_purchases", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
  ownerAuthId: text("owner_auth_id").notNull(),
  type: employerAddOnTypeEnum("type").notNull(),
  status: employerAddOnStatusEnum("status").default("pending").notNull(),
  stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  note: text("note"),
  paidAt: timestamp("paid_at"),
  fulfilledAt: timestamp("fulfilled_at"),
  consumedAt: timestamp("consumed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull()
})
