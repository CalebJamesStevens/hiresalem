ALTER TABLE "companies" ADD COLUMN "is_managed" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "plan" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "companies"
ALTER COLUMN "plan" TYPE text USING "plan"::text,
ALTER COLUMN "plan_override" TYPE text USING "plan_override"::text,
ALTER COLUMN "billing_plan" TYPE text USING "billing_plan"::text;
--> statement-breakpoint
DROP TYPE "company_plan";
--> statement-breakpoint
CREATE TYPE "public"."company_plan" AS ENUM('free', 'standard', 'partner');
--> statement-breakpoint
ALTER TABLE "companies"
ALTER COLUMN "plan" TYPE "company_plan" USING (
  CASE
    WHEN "plan" = 'enhanced_profile' THEN 'standard'
    WHEN "plan" = 'featured_job' THEN 'standard'
    WHEN "plan" = 'business_pro' THEN 'partner'
    ELSE "plan"
  END
)::"company_plan",
ALTER COLUMN "plan_override" TYPE "company_plan" USING (
  CASE
    WHEN "plan_override" = 'enhanced_profile' THEN 'standard'
    WHEN "plan_override" = 'featured_job' THEN 'standard'
    WHEN "plan_override" = 'business_pro' THEN 'partner'
    ELSE "plan_override"
  END
)::"company_plan",
ALTER COLUMN "billing_plan" TYPE "company_plan" USING (
  CASE
    WHEN "billing_plan" = 'enhanced_profile' THEN 'standard'
    WHEN "billing_plan" = 'featured_job' THEN 'standard'
    WHEN "billing_plan" = 'business_pro' THEN 'partner'
    ELSE "billing_plan"
  END
)::"company_plan";
--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "plan" SET DEFAULT 'free';
