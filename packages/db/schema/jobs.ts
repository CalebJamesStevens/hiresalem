import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { companies } from "./companies"

export const applyTypeEnum = pgEnum("apply_type", ["onsite", "external"])
export const workModeEnum = pgEnum("work_mode", ["onsite", "hybrid", "remote"])
export const employmentTypeEnum = pgEnum("employment_type", ["full_time", "part_time", "contract", "internship", "temporary"])
export const salaryIntervalEnum = pgEnum("salary_interval", ["hour", "week", "month", "year"])
export const jobPaymentStatusEnum = pgEnum("job_payment_status", ["pending", "paid", "canceled", "expired"])
export const jobCategoryEnum = pgEnum("job_category", [
  "engineering",
  "design",
  "operations",
  "finance",
  "sales",
  "marketing",
  "customer_support",
  "healthcare",
  "education",
  "skilled_trades",
  "hospitality",
  "administration"
])

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  ownerAuthId: text("owner_auth_id").notNull(),
  companyId: uuid("company_id").references(() => companies.id),
  location: text("location"),
  salary: text("salary"),
  workMode: workModeEnum("work_mode"),
  employmentType: employmentTypeEnum("employment_type"),
  category: jobCategoryEnum("category"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryCurrency: text("salary_currency"),
  salaryInterval: salaryIntervalEnum("salary_interval"),
  description: text("description"),
  applyType: applyTypeEnum("apply_type").default("onsite").notNull(),
  applyUrl: text("apply_url"),
  isActive: boolean("is_active").default(true).notNull(),
  listingDurationDays: integer("listing_duration_days").default(30).notNull(),
  paymentStatus: jobPaymentStatusEnum("payment_status").default("paid").notNull(),
  activatedAt: timestamp("activated_at"),
  expiresAt: timestamp("expires_at"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull()
})
