import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { companies } from "./companies"
import { jobs } from "./jobs"

export const engagementEventTypeEnum = pgEnum("engagement_event_type", ["job_view", "apply_click", "company_view"])

export const engagementEvents = pgTable("engagement_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
  eventType: engagementEventTypeEnum("event_type").notNull(),
  sessionKey: text("session_key"),
  occurredAt: timestamp("occurred_at").defaultNow().notNull()
})
