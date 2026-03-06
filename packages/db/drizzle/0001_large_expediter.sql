DO $$ BEGIN
 CREATE TYPE "public"."apply_type" AS ENUM('onsite', 'external');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "job_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "applicant_auth_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "owner_auth_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "apply_type" "apply_type" DEFAULT 'onsite' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "apply_url" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
