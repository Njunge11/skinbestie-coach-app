-- Drop existing step_type enum if it exists (from reverted migration 0045)
DROP TYPE IF EXISTS "public"."step_type" CASCADE;--> statement-breakpoint
-- Create step_type enum
CREATE TYPE "public"."step_type" AS ENUM('instruction_only', 'product');--> statement-breakpoint
ALTER TABLE "skincare_routine_products" ALTER COLUMN "routine_step" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "skincare_routine_products" ALTER COLUMN "product_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "skincare_routine_products" ADD COLUMN "step_type" "step_type" DEFAULT 'product' NOT NULL;--> statement-breakpoint
ALTER TABLE "skincare_routine_products" ADD CONSTRAINT "product_step_requirements" CHECK ("skincare_routine_products"."step_type" = 'instruction_only' OR ("skincare_routine_products"."routine_step" IS NOT NULL AND "skincare_routine_products"."product_name" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "skincare_routine_products" ADD CONSTRAINT "instruction_only_requirements" CHECK ("skincare_routine_products"."step_type" = 'product' OR "skincare_routine_products"."instructions" IS NOT NULL);