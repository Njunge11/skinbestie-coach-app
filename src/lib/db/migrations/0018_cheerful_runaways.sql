DROP INDEX IF EXISTS "skincare_goals_user_order_idx";--> statement-breakpoint
ALTER TABLE "user_profiles" ALTER COLUMN "user_id" DROP NOT NULL;