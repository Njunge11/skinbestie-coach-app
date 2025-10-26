-- Migration: Fix skincare_goals deferrable constraint
-- The previous migration (0017) successfully fixed routine_template_products
-- and skincare_routine_products, but failed on skincare_goals.
-- This migration completes the work by fixing just skincare_goals.

-- Drop existing unique index on skincare_goals
DROP INDEX IF EXISTS "skincare_goals_user_order_idx";

-- Create deferrable unique constraint on skincare_goals
ALTER TABLE "skincare_goals"
ADD CONSTRAINT "skincare_goals_user_order_unique"
UNIQUE ("user_profile_id", "order")
DEFERRABLE INITIALLY DEFERRED;
