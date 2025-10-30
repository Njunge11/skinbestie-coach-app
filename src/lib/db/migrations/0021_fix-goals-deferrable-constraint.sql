-- Custom SQL migration file, put your code below! --

-- Fix the skincare_goals constraint to use correct column name
-- Note: The unique index skincare_goals_template_order_idx was already dropped by migration 0022
-- We just need to create the deferrable constraint

-- 1. Drop any existing constraint that might conflict (just in case)
ALTER TABLE "skincare_goals"
DROP CONSTRAINT IF EXISTS "skincare_goals_template_order_unique";
--> statement-breakpoint
-- 2. Create the correct deferrable unique constraint
-- This allows reordering operations to defer uniqueness checking until transaction commit
ALTER TABLE "skincare_goals"
ADD CONSTRAINT "skincare_goals_template_order_unique"
UNIQUE ("template_id", "order")
DEFERRABLE INITIALLY DEFERRED;