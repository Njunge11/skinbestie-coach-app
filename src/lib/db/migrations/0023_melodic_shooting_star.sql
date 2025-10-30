CREATE TYPE "public"."goal_priority" AS ENUM('none', 'low', 'medium', 'high');--> statement-breakpoint
ALTER TABLE "skincare_goals" ADD COLUMN "priority" "goal_priority" DEFAULT 'none' NOT NULL;--> statement-breakpoint
CREATE INDEX "skincare_goals_priority_idx" ON "skincare_goals" USING btree ("priority");