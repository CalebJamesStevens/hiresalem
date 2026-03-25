DO $$ BEGIN
 CREATE TYPE "public"."employer_add_on_status" AS ENUM('pending', 'paid', 'canceled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."employer_add_on_type" AS ENUM('extra_slot', 'weekly_feature', 'social_shoutout');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employer_add_on_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"job_id" uuid,
	"owner_auth_id" text NOT NULL,
	"type" "employer_add_on_type" NOT NULL,
	"status" "employer_add_on_status" DEFAULT 'pending' NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"note" text,
	"paid_at" timestamp,
	"fulfilled_at" timestamp,
	"consumed_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employer_add_on_purchases_stripe_checkout_session_id_unique" UNIQUE("stripe_checkout_session_id")
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "featured_expires_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employer_add_on_purchases" ADD CONSTRAINT "employer_add_on_purchases_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employer_add_on_purchases" ADD CONSTRAINT "employer_add_on_purchases_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
