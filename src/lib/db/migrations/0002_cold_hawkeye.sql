CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(120) NOT NULL,
	"last_name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone_number" varchar(32) NOT NULL,
	"date_of_birth" date NOT NULL,
	"skin_type" text[],
	"concerns" text[],
	"has_allergies" boolean,
	"allergy_details" text,
	"is_subscribed" boolean,
	"has_completed_booking" boolean,
	"completed_steps" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_profiles_email_idx" ON "user_profiles" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "user_profiles_phone_idx" ON "user_profiles" USING btree ("phone_number");