CREATE TABLE "routine_template_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
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
CREATE TABLE "routine_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "routine_template_products" ADD CONSTRAINT "routine_template_products_template_id_routine_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."routine_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_templates" ADD CONSTRAINT "routine_templates_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "routine_template_products_template_idx" ON "routine_template_products" USING btree ("template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "routine_template_products_template_time_order_idx" ON "routine_template_products" USING btree ("template_id","time_of_day","order");--> statement-breakpoint
CREATE INDEX "routine_templates_created_by_idx" ON "routine_templates" USING btree ("created_by");