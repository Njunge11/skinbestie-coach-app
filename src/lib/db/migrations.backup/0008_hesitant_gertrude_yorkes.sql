CREATE TABLE "skincare_routines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_profile_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "skincare_routine_products_user_time_order_idx";--> statement-breakpoint
ALTER TABLE "skincare_routine_products" ADD COLUMN "routine_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "skincare_routines" ADD CONSTRAINT "skincare_routines_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skincare_routines_user_profile_idx" ON "skincare_routines" USING btree ("user_profile_id");--> statement-breakpoint
ALTER TABLE "skincare_routine_products" ADD CONSTRAINT "skincare_routine_products_routine_id_skincare_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."skincare_routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skincare_routine_products_routine_idx" ON "skincare_routine_products" USING btree ("routine_id");--> statement-breakpoint
CREATE UNIQUE INDEX "skincare_routine_products_routine_time_order_idx" ON "skincare_routine_products" USING btree ("routine_id","time_of_day","order");