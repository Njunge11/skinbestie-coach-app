CREATE TABLE "journals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_profile_id" uuid NOT NULL,
	"title" text DEFAULT 'Untitled Journal Entry' NOT NULL,
	"content" jsonb DEFAULT '{
      "root": {
        "children": [],
        "direction": "ltr",
        "format": "",
        "indent": 0,
        "type": "root",
        "version": 1
      }
    }'::jsonb NOT NULL,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_modified" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journals" ADD CONSTRAINT "journals_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "journals_user_profile_idx" ON "journals" USING btree ("user_profile_id");--> statement-breakpoint
CREATE INDEX "journals_created_at_idx" ON "journals" USING btree ("user_profile_id","created_at");--> statement-breakpoint
CREATE INDEX "journals_last_modified_idx" ON "journals" USING btree ("last_modified");