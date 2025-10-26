CREATE INDEX "routine_templates_name_idx" ON "routine_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "skincare_routine_products_time_order_idx" ON "skincare_routine_products" USING btree ("time_of_day","order");--> statement-breakpoint
CREATE INDEX "skincare_routines_status_idx" ON "skincare_routines" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_profiles_name_idx" ON "user_profiles" USING btree ("first_name","last_name");