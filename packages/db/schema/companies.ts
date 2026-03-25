import { boolean, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"

import { companyPlanIds } from "../plans"

export const companyPlanEnum = pgEnum("company_plan", companyPlanIds)
export const companyBillingStatusEnum = pgEnum("company_billing_status", [
  "inactive",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused"
])

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  ownerAuthId: text("owner_auth_id").notNull().unique(),
  claimedAt: timestamp("claimed_at"),
  logoUrl: text("logo_url"),
  shortDescription: text("short_description"),
  website: text("website"),
  location: text("location"),
  isManaged: boolean("is_managed").default(false).notNull(),
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
  billingPlan: companyPlanEnum("billing_plan"),
  billingStatus: companyBillingStatusEnum("billing_status").default("inactive").notNull(),
  billingCancelAtPeriodEnd: boolean("billing_cancel_at_period_end").default(false).notNull(),
  billingCurrentPeriodEnd: timestamp("billing_current_period_end"),
  billingUpdatedAt: timestamp("billing_updated_at"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  planAssignedAt: timestamp("plan_assigned_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
  return {
    stripeCustomerIdIdx: uniqueIndex("companies_stripe_customer_id_idx").on(table.stripeCustomerId),
    stripeSubscriptionIdIdx: uniqueIndex("companies_stripe_subscription_id_idx").on(table.stripeSubscriptionId)
  }
})
