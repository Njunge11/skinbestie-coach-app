CREATE TYPE "public"."goal_template_status" AS ENUM('published', 'unpublished');--> statement-breakpoint
CREATE TABLE "skin_goals_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "goal_template_status" DEFAULT 'unpublished' NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skin_goals_template_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "skincare_goals" DROP CONSTRAINT "skincare_goals_user_profile_id_user_profiles_id_fk";
--> statement-breakpoint
DROP INDEX "skincare_goals_user_profile_idx";--> statement-breakpoint
ALTER TABLE "skincare_goals" ADD COLUMN "template_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "skincare_goals" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "skin_goals_template" ADD CONSTRAINT "skin_goals_template_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skin_goals_template" ADD CONSTRAINT "skin_goals_template_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skin_goals_template" ADD CONSTRAINT "skin_goals_template_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "skin_goals_template_user_id_idx" ON "skin_goals_template" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "skin_goals_template_status_idx" ON "skin_goals_template" USING btree ("status");--> statement-breakpoint
CREATE INDEX "skin_goals_template_created_by_idx" ON "skin_goals_template" USING btree ("created_by");--> statement-breakpoint
ALTER TABLE "skincare_goals" ADD CONSTRAINT "skincare_goals_template_id_skin_goals_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."skin_goals_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skincare_goals_template_idx" ON "skincare_goals" USING btree ("template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "skincare_goals_template_order_idx" ON "skincare_goals" USING btree ("template_id","order");--> statement-breakpoint
ALTER TABLE "skincare_goals" DROP COLUMN "user_profile_id";--> statement-breakpoint
ALTER TABLE "skincare_goals" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "skincare_goals" DROP COLUMN "timeframe";