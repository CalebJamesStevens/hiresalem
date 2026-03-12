DO $$ BEGIN
 CREATE TYPE "public"."company_billing_status" AS ENUM('inactive', 'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "billing_plan" "company_plan";--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "billing_status" "company_billing_status" DEFAULT 'inactive' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "billing_cancel_at_period_end" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "billing_current_period_end" timestamp;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "billing_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "companies_stripe_customer_id_idx" ON "companies" ("stripe_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "companies_stripe_subscription_id_idx" ON "companies" ("stripe_subscription_id");