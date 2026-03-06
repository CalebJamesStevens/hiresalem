ALTER TABLE "applications" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "linkedin_url" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "portfolio_url" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "cover_letter" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "applications_job_id_applicant_auth_id_idx" ON "applications" ("job_id","applicant_auth_id");