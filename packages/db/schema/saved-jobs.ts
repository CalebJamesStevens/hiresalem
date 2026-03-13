import { boolean, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"

import { jobs } from "./jobs"

export const savedJobAlertStateEnum = pgEnum("saved_job_alert_state", ["live", "closed"])

export const savedJobs = pgTable(
  "saved_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userAuthId: text("user_auth_id").notNull(),
    recipientEmail: text("recipient_email").notNull(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    alertsEnabled: boolean("alerts_enabled").default(true).notNull(),
    lastAlertedState: savedJobAlertStateEnum("last_alerted_state"),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => {
    return {
      savedJobsUserJobIdx: uniqueIndex("saved_jobs_user_job_idx").on(table.userAuthId, table.jobId)
    }
  }
)
