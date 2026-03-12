DO $$ BEGIN
 CREATE TYPE "public"."company_plan" AS ENUM('free', 'enhanced_profile', 'featured_job', 'business_pro');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "plan" "company_plan" DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "plan_override" "company_plan";--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "plan_override_reason" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "plan_assigned_at" timestamp DEFAULT now() NOT NULL;