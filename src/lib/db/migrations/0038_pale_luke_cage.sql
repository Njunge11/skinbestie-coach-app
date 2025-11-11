CREATE TABLE "profile_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_profile_id" uuid NOT NULL,
	"tag" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile_tags" ADD CONSTRAINT "profile_tags_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_tags_user_profile_idx" ON "profile_tags" USING btree ("user_profile_id");--> statement-breakpoint
CREATE INDEX "profile_tags_tag_idx" ON "profile_tags" USING btree ("tag");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_tags_user_tag_idx" ON "profile_tags" USING btree ("user_profile_id","tag");