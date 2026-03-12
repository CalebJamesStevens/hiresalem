ALTER TABLE "jobs" ADD COLUMN "job_location_city" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "job_location_region" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "job_location_country" text;--> statement-breakpoint
UPDATE "jobs"
SET
  "job_location_city" = CASE
    WHEN "location" ILIKE '%salem%' THEN 'Salem'
    WHEN "location" ILIKE '%keizer%' THEN 'Keizer'
    WHEN "location" ILIKE '%woodburn%' THEN 'Woodburn'
    WHEN "location" ILIKE '%dallas%' THEN 'Dallas'
    WHEN "location" ILIKE '%monmouth%' THEN 'Monmouth'
    WHEN "location" ILIKE '%independence%' THEN 'Independence'
    WHEN "location" ILIKE '%silverton%' THEN 'Silverton'
    ELSE "job_location_city"
  END,
  "job_location_region" = CASE
    WHEN "location" ILIKE '%salem%'
      OR "location" ILIKE '%keizer%'
      OR "location" ILIKE '%woodburn%'
      OR "location" ILIKE '%dallas%'
      OR "location" ILIKE '%monmouth%'
      OR "location" ILIKE '%independence%'
      OR "location" ILIKE '%silverton%' THEN 'OR'
    ELSE "job_location_region"
  END,
  "job_location_country" = CASE
    WHEN "location" ILIKE '%salem%'
      OR "location" ILIKE '%keizer%'
      OR "location" ILIKE '%woodburn%'
      OR "location" ILIKE '%dallas%'
      OR "location" ILIKE '%monmouth%'
      OR "location" ILIKE '%independence%'
      OR "location" ILIKE '%silverton%' THEN 'US'
    ELSE "job_location_country"
  END
WHERE
  coalesce("work_mode", 'onsite') <> 'remote'
  AND "job_location_city" IS NULL
  AND "job_location_region" IS NULL
  AND "job_location_country" IS NULL
  AND (
    "location" ILIKE '%salem%'
    OR "location" ILIKE '%keizer%'
    OR "location" ILIKE '%woodburn%'
    OR "location" ILIKE '%dallas%'
    OR "location" ILIKE '%monmouth%'
    OR "location" ILIKE '%independence%'
    OR "location" ILIKE '%silverton%'
  );
