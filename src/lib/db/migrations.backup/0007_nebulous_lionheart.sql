CREATE TABLE "progress_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_profile_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"week_number" integer NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "progress_photos_user_profile_idx" ON "progress_photos" USING btree ("user_profile_id");--> statement-breakpoint
CREATE INDEX "progress_photos_uploaded_at_idx" ON "progress_photos" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "progress_photos_user_week_idx" ON "progress_photos" USING btree ("user_profile_id","week_number");