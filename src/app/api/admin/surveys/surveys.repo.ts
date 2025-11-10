// Repository layer for surveys data access
// Uses optimized queries with JOINs for minimal database round trips

import { eq, and, desc, asc } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { db as defaultDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";

// For dependency injection in tests
export type SurveysRepoDeps = {
  db?:
    | typeof defaultDb
    | PostgresJsDatabase<typeof schema>
    | PgliteDatabase<typeof schema>;
};

export function makeSurveysRepo(deps: SurveysRepoDeps = {}) {
  const db = deps.db || defaultDb;

  return {
    /**
     * Create a new survey
     */
    async createSurvey(data: {
      title: string;
      description: string | null;
      status: "draft" | "published" | "archived";
      createdBy: string;
      updatedBy: string;
    }) {
      const [survey] = await db.insert(schema.surveys).values(data).returning();

      return survey;
    },

    /**
     * Get survey with all its questions
     */
    async getSurveyWithQuestions(surveyId: string) {
      // Get survey
      const surveyResult = await db
        .select()
        .from(schema.surveys)
        .where(eq(schema.surveys.id, surveyId))
        .limit(1);

      if (surveyResult.length === 0) {
        return null;
      }

      // Get questions ordered by order field
      const questions = await db
        .select()
        .from(schema.surveyQuestions)
        .where(eq(schema.surveyQuestions.surveyId, surveyId))
        .orderBy(asc(schema.surveyQuestions.order));

      return {
        ...surveyResult[0],
        questions,
      };
    },

    /**
     * Add questions to a survey
     */
    async addQuestions(
      surveyId: string,
      questions: Array<{
        questionText: string;
        questionType: "yes_no" | "freehand";
        helperText: string | null;
        isRequired: boolean;
        order: number;
      }>,
    ) {
      const insertedQuestions = await db
        .insert(schema.surveyQuestions)
        .values(
          questions.map((q) => ({
            surveyId,
            ...q,
          })),
        )
        .returning();

      return insertedQuestions;
    },

    /**
     * Submit survey responses (creates submission + responses in transaction)
     */
    async submitSurveyResponses(
      surveyId: string,
      userProfileId: string,
      responses: Array<{
        questionId: string;
        yesNoAnswer: boolean | null;
        freehandAnswer: string | null;
      }>,
      txDb: typeof db,
    ) {
      // Create submission
      const [submission] = await txDb
        .insert(schema.surveySubmissions)
        .values({
          surveyId,
          userProfileId,
        })
        .returning();

      // Create responses
      await txDb.insert(schema.surveyResponses).values(
        responses.map((r) => ({
          submissionId: submission.id,
          questionId: r.questionId,
          userProfileId,
          yesNoAnswer: r.yesNoAnswer,
          freehandAnswer: r.freehandAnswer,
        })),
      );

      return {
        submissionId: submission.id,
        submittedAt: submission.submittedAt,
        responsesCount: responses.length,
      };
    },

    /**
     * Get all submissions for a user on a specific survey
     */
    async getUserSubmissions(surveyId: string, userProfileId: string) {
      // Get all submissions for this user on this survey
      const submissions = await db
        .select()
        .from(schema.surveySubmissions)
        .where(
          and(
            eq(schema.surveySubmissions.surveyId, surveyId),
            eq(schema.surveySubmissions.userProfileId, userProfileId),
          ),
        )
        .orderBy(desc(schema.surveySubmissions.submittedAt));

      // For each submission, get responses with question details
      const result = await Promise.all(
        submissions.map(async (submission) => {
          const responses = await db
            .select({
              questionId: schema.surveyResponses.questionId,
              questionText: schema.surveyQuestions.questionText,
              questionType: schema.surveyQuestions.questionType,
              yesNoAnswer: schema.surveyResponses.yesNoAnswer,
              freehandAnswer: schema.surveyResponses.freehandAnswer,
            })
            .from(schema.surveyResponses)
            .innerJoin(
              schema.surveyQuestions,
              eq(schema.surveyResponses.questionId, schema.surveyQuestions.id),
            )
            .where(eq(schema.surveyResponses.submissionId, submission.id))
            .orderBy(asc(schema.surveyQuestions.order));

          return {
            submissionId: submission.id,
            submittedAt: submission.submittedAt,
            responses,
          };
        }),
      );

      return result;
    },
  };
}

// Export type for testing/dependency injection
export type SurveysRepo = ReturnType<typeof makeSurveysRepo>;
