CREATE TABLE "skincare_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_profile_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"timeframe" text NOT NULL,
	"complete" boolean DEFAULT false NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "skincare_goals" ADD CONSTRAINT "skincare_goals_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skincare_goals_user_profile_idx" ON "skincare_goals" USING btree ("user_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "skincare_goals_user_order_idx" ON "skincare_goals" USING btree ("user_profile_id","order");