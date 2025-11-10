CREATE TABLE "survey_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" uuid NOT NULL,
	"user_profile_id" uuid NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "survey_responses" DROP CONSTRAINT "survey_responses_survey_id_surveys_id_fk";
--> statement-breakpoint
DROP INDEX "survey_responses_survey_idx";--> statement-breakpoint
DROP INDEX "survey_responses_user_survey_idx";--> statement-breakpoint
DROP INDEX "survey_responses_user_question_idx";--> statement-breakpoint
ALTER TABLE "survey_responses" ADD COLUMN "submission_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "survey_submissions" ADD CONSTRAINT "survey_submissions_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_submissions" ADD CONSTRAINT "survey_submissions_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "survey_submissions_survey_idx" ON "survey_submissions" USING btree ("survey_id");--> statement-breakpoint
CREATE INDEX "survey_submissions_user_idx" ON "survey_submissions" USING btree ("user_profile_id");--> statement-breakpoint
CREATE INDEX "survey_submissions_user_survey_idx" ON "survey_submissions" USING btree ("user_profile_id","survey_id");--> statement-breakpoint
CREATE INDEX "survey_submissions_submitted_at_idx" ON "survey_submissions" USING btree ("submitted_at");--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_submission_id_survey_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."survey_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "survey_responses_submission_idx" ON "survey_responses" USING btree ("submission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_responses_submission_question_idx" ON "survey_responses" USING btree ("submission_id","question_id");--> statement-breakpoint
ALTER TABLE "survey_responses" DROP COLUMN "survey_id";