-- Migration: Make order unique constraints deferrable for better reordering performance
-- This allows PostgreSQL to defer constraint checking until transaction commit,
-- eliminating constraint violations during batch UPDATE operations.

-- 1. Drop existing unique index on skincare_goals
DROP INDEX IF EXISTS "skincare_goals_user_order_idx";

-- 2. Create deferrable unique constraint on skincare_goals
ALTER TABLE "skincare_goals"
ADD CONSTRAINT "skincare_goals_user_order_unique"
UNIQUE ("user_profile_id", "order")
DEFERRABLE INITIALLY DEFERRED;

-- 3. Drop existing unique index on routine_template_products
DROP INDEX IF EXISTS "routine_template_products_template_time_order_idx";

-- 4. Create deferrable unique constraint on routine_template_products
ALTER TABLE "routine_template_products"
ADD CONSTRAINT "routine_template_products_template_time_order_unique"
UNIQUE ("template_id", "time_of_day", "order")
DEFERRABLE INITIALLY DEFERRED;

-- 5. Drop existing unique index on skincare_routine_products
DROP INDEX IF EXISTS "skincare_routine_products_routine_time_order_idx";

-- 6. Create deferrable unique constraint on skincare_routine_products
ALTER TABLE "skincare_routine_products"
ADD CONSTRAINT "skincare_routine_products_routine_time_order_unique"
UNIQUE ("routine_id", "time_of_day", "order")
DEFERRABLE INITIALLY DEFERRED;
