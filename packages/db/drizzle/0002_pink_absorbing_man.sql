ALTER TABLE "companies" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "owner_auth_id" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "companies"
SET
	"slug" = COALESCE(NULLIF(regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g'), ''), 'company-' || substring(replace("id"::text, '-', '') from 1 for 8)),
	"owner_auth_id" = COALESCE(
		(
			SELECT min("owner_auth_id")
			FROM "jobs"
			WHERE "jobs"."company_id" = "companies"."id"
		),
		'legacy-company-' || replace("id"::text, '-', '')
	);--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "owner_auth_id" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_owner_auth_id_unique" UNIQUE("owner_auth_id");
