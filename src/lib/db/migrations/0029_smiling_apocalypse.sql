ALTER TABLE "progress_photos" ALTER COLUMN "week_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "progress_photos" ADD COLUMN "s3_key" text;--> statement-breakpoint
ALTER TABLE "progress_photos" ADD COLUMN "s3_bucket" text;--> statement-breakpoint
ALTER TABLE "progress_photos" ADD COLUMN "original_name" text;--> statement-breakpoint
ALTER TABLE "progress_photos" ADD COLUMN "bytes" integer;--> statement-breakpoint
ALTER TABLE "progress_photos" ADD COLUMN "mime" text;--> statement-breakpoint
ALTER TABLE "progress_photos" ADD COLUMN "width" integer;--> statement-breakpoint
ALTER TABLE "progress_photos" ADD COLUMN "height" integer;--> statement-breakpoint
ALTER TABLE "progress_photos" ADD COLUMN "status" text DEFAULT 'uploaded' NOT NULL;--> statement-breakpoint
CREATE INDEX "progress_photos_s3_key_idx" ON "progress_photos" USING btree ("s3_key");--> statement-breakpoint
CREATE INDEX "progress_photos_status_idx" ON "progress_photos" USING btree ("status");