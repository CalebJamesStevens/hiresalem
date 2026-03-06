import { pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"

import { jobs } from "./jobs"

export const applicationStageEnum = pgEnum("application_stage", ["new", "reviewed", "interviewing", "offer", "rejected"])

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    applicantAuthId: text("applicant_auth_id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    location: text("location"),
    resume: text("resume"),
    linkedinUrl: text("linkedin_url"),
    portfolioUrl: text("portfolio_url"),
    coverLetter: text("cover_letter"),
    stage: applicationStageEnum("stage").default("new").notNull(),
    stageUpdatedAt: timestamp("stage_updated_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    internalNotes: text("internal_notes"),
    nextStepAt: timestamp("next_step_at"),
    nextStepNote: text("next_step_note"),
    lastContactedAt: timestamp("last_contacted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => ({
    applicantPerJobIdx: uniqueIndex("applications_job_id_applicant_auth_id_idx").on(table.jobId, table.applicantAuthId)
  })
)
