DO $$ BEGIN
 CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'contract', 'internship', 'temporary');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."job_category" AS ENUM('engineering', 'design', 'operations', 'finance', 'sales', 'marketing', 'customer_support', 'healthcare', 'education', 'skilled_trades', 'hospitality', 'administration');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."salary_interval" AS ENUM('hour', 'week', 'month', 'year');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."work_mode" AS ENUM('onsite', 'hybrid', 'remote');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_auth_id" text NOT NULL,
	"name" text NOT NULL,
	"query_string" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "work_mode" "work_mode";--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "employment_type" "employment_type";--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "category" "job_category";--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_min" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_max" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_currency" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_interval" "salary_interval";
--> statement-breakpoint
UPDATE "jobs"
SET
	"work_mode" = CASE
		WHEN "work_mode" IS NOT NULL THEN "work_mode"
		WHEN coalesce("location", '') ILIKE '%remote%' THEN 'remote'::"work_mode"
		WHEN coalesce("location", '') ILIKE '%hybrid%' THEN 'hybrid'::"work_mode"
		ELSE 'onsite'::"work_mode"
	END
WHERE "work_mode" IS NULL;
--> statement-breakpoint
UPDATE "jobs"
SET
	"salary_min" = CASE
		WHEN "salary_min" IS NOT NULL THEN "salary_min"
		WHEN "salary" ~* '\$?\s*[0-9]+(\.[0-9]+)?k' THEN (
			regexp_replace(split_part(lower("salary"), '-', 1), '[^0-9.]', '', 'g')::numeric *
			CASE WHEN split_part(lower("salary"), '-', 1) ~ 'k' THEN 1000 ELSE 1 END
		)::int
		WHEN "salary" ~* '\$?\s*[0-9]+' THEN regexp_replace(split_part(lower("salary"), '-', 1), '[^0-9.]', '', 'g')::numeric::int
		ELSE NULL
	END,
	"salary_max" = CASE
		WHEN "salary_max" IS NOT NULL THEN "salary_max"
		WHEN position('-' in coalesce("salary", '')) > 0 AND split_part(lower("salary"), '-', 2) ~* '\$?\s*[0-9]+(\.[0-9]+)?k' THEN (
			regexp_replace(split_part(lower("salary"), '-', 2), '[^0-9.]', '', 'g')::numeric *
			CASE WHEN split_part(lower("salary"), '-', 2) ~ 'k' THEN 1000 ELSE 1 END
		)::int
		WHEN position('-' in coalesce("salary", '')) > 0 AND split_part(lower("salary"), '-', 2) ~* '\$?\s*[0-9]+' THEN regexp_replace(split_part(lower("salary"), '-', 2), '[^0-9.]', '', 'g')::numeric::int
		ELSE "salary_max"
	END,
	"salary_currency" = CASE
		WHEN "salary_currency" IS NOT NULL THEN "salary_currency"
		WHEN "salary" LIKE '%$%' THEN 'USD'
		ELSE NULL
	END,
	"salary_interval" = CASE
		WHEN "salary_interval" IS NOT NULL THEN "salary_interval"
		WHEN "salary" IS NOT NULL THEN 'year'::"salary_interval"
		ELSE NULL
	END
WHERE "salary" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_public_created_at_idx" ON "jobs" ("is_active", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_work_mode_idx" ON "jobs" ("work_mode") WHERE "is_active" = true;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_employment_type_idx" ON "jobs" ("employment_type") WHERE "is_active" = true;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_category_idx" ON "jobs" ("category") WHERE "is_active" = true;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_apply_type_idx" ON "jobs" ("apply_type") WHERE "is_active" = true;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_salary_min_idx" ON "jobs" ("salary_min") WHERE "is_active" = true;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_salary_max_idx" ON "jobs" ("salary_max") WHERE "is_active" = true;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_search_vector_idx" ON "jobs" USING gin (
	(
		setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
		setweight(to_tsvector('english', coalesce("location", '')), 'B') ||
		setweight(to_tsvector('english', coalesce("description", '')), 'C')
	)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_title_trgm_idx" ON "jobs" USING gin ("title" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_location_trgm_idx" ON "jobs" USING gin ("location" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "companies_name_trgm_idx" ON "companies" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_searches_user_idx" ON "saved_searches" ("user_auth_id", "created_at" DESC);
