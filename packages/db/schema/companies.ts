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
  linkedinUrl: text("linkedin_url"),
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  aboutSection: text("about_section"),
  whyWorkHere: text("why_work_here"),
  benefits: text("benefits"),
  coverImageUrl: text("cover_image_url"),
  galleryImageUrl1: text("gallery_image_url_1"),
  galleryImageUrl2: text("gallery_image_url_2"),
  plan: companyPlanEnum("plan").default("free").notNull(),
  planOverride: companyPlanEnum("plan_override"),
  planOverrideReason: text("plan_override_reason"),
  planAssignedAt: timestamp("plan_assigned_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})
