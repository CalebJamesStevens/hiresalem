DO $$ BEGIN
 CREATE TYPE "public"."application_stage" AS ENUM('new', 'reviewed', 'interviewing', 'offer', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "stage" "application_stage" DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "stage_updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "internal_notes" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "next_step_at" timestamp;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "next_step_note" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "last_contacted_at" timestamp;