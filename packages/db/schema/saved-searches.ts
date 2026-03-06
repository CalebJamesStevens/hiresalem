import { boolean, timestamp, text, uuid, pgTable } from "drizzle-orm/pg-core"

export const savedSearches = pgTable("saved_searches", {
  id: uuid("id").defaultRandom().primaryKey(),
  userAuthId: text("user_auth_id").notNull(),
  name: text("name").notNull(),
  queryString: text("query_string").notNull(),
  recipientEmail: text("recipient_email"),
  alertsEnabled: boolean("alerts_enabled").default(false).notNull(),
  lastDigestSentAt: timestamp("last_digest_sent_at"),
  lastDeliveredJobCreatedAt: timestamp("last_delivered_job_created_at"),
  createdAt: timestamp("created_at").defaultNow().notNull()
})
