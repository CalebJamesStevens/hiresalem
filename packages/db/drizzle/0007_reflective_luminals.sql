DO $$ BEGIN
 CREATE TYPE "public"."job_payment_status" AS ENUM('pending', 'paid', 'canceled', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "listing_duration_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "payment_status" "job_payment_status" DEFAULT 'paid' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "activated_at" timestamp;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "stripe_checkout_session_id" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_stripe_checkout_session_id_unique" UNIQUE("stripe_checkout_session_id");