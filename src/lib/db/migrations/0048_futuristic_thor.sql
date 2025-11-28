ALTER TABLE "routine_template_products" ALTER COLUMN "routine_step" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "routine_template_products" ALTER COLUMN "product_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "routine_template_products" ADD COLUMN "step_type" "step_type" DEFAULT 'product' NOT NULL;--> statement-breakpoint
ALTER TABLE "routine_template_products" ADD COLUMN "step_name" text;--> statement-breakpoint
ALTER TABLE "routine_template_products" ADD COLUMN "product_purchase_instructions" text;