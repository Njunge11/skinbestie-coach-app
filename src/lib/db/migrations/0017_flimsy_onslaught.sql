CREATE TYPE "public"."admin_role" AS ENUM('admin', 'superadmin');--> statement-breakpoint
CREATE TYPE "public"."completion_status" AS ENUM('pending', 'on-time', 'late', 'missed');--> statement-breakpoint
CREATE TYPE "public"."frequency" AS ENUM('daily', '2x per week', '3x per week', 'specific_days');--> statement-breakpoint
CREATE TYPE "public"."routine_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."time_of_day" AS ENUM('morning', 'evening');--> statement-breakpoint
ALTER TABLE "admins" ALTER COLUMN "role" SET DEFAULT 'admin'::"public"."admin_role";--> statement-breakpoint
ALTER TABLE "admins" ALTER COLUMN "role" SET DATA TYPE "public"."admin_role" USING "role"::"public"."admin_role";--> statement-breakpoint
ALTER TABLE "routine_step_completions" ALTER COLUMN "scheduled_time_of_day" SET DATA TYPE time_of_day USING "scheduled_time_of_day"::time_of_day;--> statement-breakpoint
ALTER TABLE "routine_step_completions" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."completion_status";--> statement-breakpoint
ALTER TABLE "routine_step_completions" ALTER COLUMN "status" SET DATA TYPE "public"."completion_status" USING "status"::"public"."completion_status";--> statement-breakpoint
ALTER TABLE "routine_template_products" ALTER COLUMN "frequency" SET DATA TYPE "public"."frequency" USING "frequency"::"public"."frequency";--> statement-breakpoint
ALTER TABLE "routine_template_products" ALTER COLUMN "time_of_day" SET DATA TYPE time_of_day USING "time_of_day"::time_of_day;--> statement-breakpoint
ALTER TABLE "skincare_routine_products" ALTER COLUMN "frequency" SET DATA TYPE "public"."frequency" USING "frequency"::"public"."frequency";--> statement-breakpoint
ALTER TABLE "skincare_routine_products" ALTER COLUMN "time_of_day" SET DATA TYPE time_of_day USING "time_of_day"::time_of_day;--> statement-breakpoint
ALTER TABLE "skincare_routines" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."routine_status";--> statement-breakpoint
ALTER TABLE "skincare_routines" ALTER COLUMN "status" SET DATA TYPE "public"."routine_status" USING "status"::"public"."routine_status";