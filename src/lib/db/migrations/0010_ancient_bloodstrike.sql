CREATE TABLE "routine_step_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"routine_product_id" uuid NOT NULL,
	"user_profile_id" uuid NOT NULL,
	"scheduled_date" date NOT NULL,
	"scheduled_time_of_day" text NOT NULL,
	"on_time_deadline" timestamp with time zone NOT NULL,
	"grace_period_end" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "timezone" text DEFAULT 'Europe/London' NOT NULL;--> statement-breakpoint
ALTER TABLE "routine_step_completions" ADD CONSTRAINT "routine_step_completions_routine_product_id_skincare_routine_products_id_fk" FOREIGN KEY ("routine_product_id") REFERENCES "public"."skincare_routine_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_step_completions" ADD CONSTRAINT "routine_step_completions_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "routine_step_completions_user_idx" ON "routine_step_completions" USING btree ("user_profile_id");--> statement-breakpoint
CREATE INDEX "routine_step_completions_product_idx" ON "routine_step_completions" USING btree ("routine_product_id");--> statement-breakpoint
CREATE INDEX "routine_step_completions_date_idx" ON "routine_step_completions" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "routine_step_completions_user_date_idx" ON "routine_step_completions" USING btree ("user_profile_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "routine_step_completions_status_grace_idx" ON "routine_step_completions" USING btree ("status","grace_period_end");--> statement-breakpoint
CREATE INDEX "routine_step_completions_user_date_range_idx" ON "routine_step_completions" USING btree ("user_profile_id","scheduled_date","status");--> statement-breakpoint
CREATE UNIQUE INDEX "routine_step_completions_unique_schedule" ON "routine_step_completions" USING btree ("routine_product_id","scheduled_date");