CREATE TABLE "skincare_routine_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_profile_id" uuid NOT NULL,
	"routine_step" text NOT NULL,
	"product_name" text NOT NULL,
	"product_url" text,
	"instructions" text NOT NULL,
	"frequency" text NOT NULL,
	"days" text[],
	"time_of_day" text NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "skincare_routine_products" ADD CONSTRAINT "skincare_routine_products_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skincare_routine_products_user_profile_idx" ON "skincare_routine_products" USING btree ("user_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "skincare_routine_products_user_time_order_idx" ON "skincare_routine_products" USING btree ("user_profile_id","time_of_day","order");