ALTER TABLE "saved_searches" ADD COLUMN "recipient_email" text;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD COLUMN "alerts_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD COLUMN "last_digest_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD COLUMN "last_delivered_job_created_at" timestamp;