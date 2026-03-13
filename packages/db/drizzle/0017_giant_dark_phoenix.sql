DO $$ BEGIN
 CREATE TYPE "public"."company_claim_request_status" AS ENUM('pending', 'approved', 'rejected', 'canceled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."engagement_event_type" AS ENUM('job_view', 'apply_click', 'company_view');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."saved_job_alert_state" AS ENUM('live', 'closed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_claim_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"requester_auth_id" text NOT NULL,
	"contact_email" text NOT NULL,
	"message" text,
	"status" "company_claim_request_status" DEFAULT 'pending' NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by_auth_id" text,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "engagement_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"job_id" uuid,
	"event_type" "engagement_event_type" NOT NULL,
	"session_key" text,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_auth_id" text NOT NULL,
	"recipient_email" text NOT NULL,
	"job_id" uuid NOT NULL,
	"alerts_enabled" boolean DEFAULT true NOT NULL,
	"last_alerted_state" "saved_job_alert_state",
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "claimed_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_claim_requests" ADD CONSTRAINT "company_claim_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "engagement_events" ADD CONSTRAINT "engagement_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "engagement_events" ADD CONSTRAINT "engagement_events_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
UPDATE "companies"
SET "claimed_at" = "created_at"
WHERE "claimed_at" IS NULL
  AND "owner_auth_id" NOT LIKE 'system:%'
  AND "owner_auth_id" NOT LIKE '%:company:%';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "company_claim_requests_pending_idx" ON "company_claim_requests" ("company_id","requester_auth_id") WHERE "status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "saved_jobs_user_job_idx" ON "saved_jobs" ("user_auth_id","job_id");
