import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { companyPlanIds } from "../plans"

export const companyPlanEnum = pgEnum("company_plan", companyPlanIds)

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  ownerAuthId: text("owner_auth_id").notNull().unique(),
  logoUrl: text("logo_url"),
  shortDescription: text("short_description"),
  website: text("website"),
  location: text("location"),
  plan: companyPlanEnum("plan").default("free").notNull(),
  planOverride: companyPlanEnum("plan_override"),
  planOverrideReason: text("plan_override_reason"),
  planAssignedAt: timestamp("plan_assigned_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})
