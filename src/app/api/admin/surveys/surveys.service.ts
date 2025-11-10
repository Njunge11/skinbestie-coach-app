// Service layer for surveys business logic
// Handles validation, transactions, and orchestration

import { makeSurveysRepo, type SurveysRepo } from "./surveys.repo";
import { db as defaultDb } from "@/lib/db";

// Service dependencies for testing
export type SurveysServiceDeps = {
  repo?: SurveysRepo;
  db?: typeof defaultDb;
};

// Service result types
type ServiceSuccess<T> = { success: true; data: T };
type ServiceError = { success: false; error: string };
type ServiceResult<T> = ServiceSuccess<T> | ServiceError;

// Return types
type Question = {
  id: string;
  surveyId: string;
  questionText: string;
  questionType: "yes_no" | "freehand";
  helperText: string | null;
  isRequired: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

type Survey = {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

type SurveyWithQuestions = Survey & {
  questions: Question[];
};

type SubmitResponsesResult = {
  submissionId: string;
  submittedAt: Date;
  responsesCount: number;
};

type ResponseDetail = {
  questionId: string;
  questionText: string;
  questionType: "yes_no" | "freehand";
  yesNoAnswer: boolean | null;
  freehandAnswer: string | null;
};

type Submission = {
  submissionId: string;
  submittedAt: Date;
  responses: ResponseDetail[];
};

type SubmissionHistory = {
  surveyId: string;
  userId: string;
  submissions: Submission[];
};

export function makeSurveysService(deps: SurveysServiceDeps = {}) {
  const repo = deps.repo || makeSurveysRepo();
  const db = deps.db || defaultDb;

  return {
    /**
     * Create survey with questions in one operation
     */
    async createSurveyWithQuestions(data: {
      title: string;
      description: string | null;
      status: "draft" | "published" | "archived";
      createdBy: string;
      questions: Array<{
        questionText: string;
        questionType: "yes_no" | "freehand";
        helperText: string | null;
        isRequired: boolean;
        order: number;
      }>;
    }): Promise<ServiceResult<SurveyWithQuestions>> {
      try {
        // Validation
        if (!data.title || data.title.trim() === "") {
          return { success: false, error: "Invalid data: title is required" };
        }

        // Create survey
        const survey = await repo.createSurvey({
          title: data.title,
          description: data.description,
          status: data.status,
          createdBy: data.createdBy,
          updatedBy: data.createdBy,
        });

        // Add questions if provided
        let questions: Question[] = [];
        if (data.questions && data.questions.length > 0) {
          questions = await repo.addQuestions(survey.id, data.questions);
        }

        return {
          success: true,
          data: {
            ...survey,
            questions,
          },
        };
      } catch (error) {
        console.error("Error creating survey:", error);
        return { success: false, error: "Failed to create survey" };
      }
    },

    /**
     * Get survey with all questions
     */
    async getSurvey(
      surveyId: string,
    ): Promise<ServiceResult<SurveyWithQuestions>> {
      try {
        const survey = await repo.getSurveyWithQuestions(surveyId);

        if (!survey) {
          return { success: false, error: "Survey not found" };
        }

        return { success: true, data: survey };
      } catch (error) {
        console.error("Error getting survey:", error);
        return { success: false, error: "Failed to get survey" };
      }
    },

    /**
     * Submit user responses to survey
     */
    async submitResponses(data: {
      userId: string;
      surveyId: string;
      responses: Array<{
        questionId: string;
        yesNoAnswer: boolean | null;
        freehandAnswer: string | null;
      }>;
    }): Promise<ServiceResult<SubmitResponsesResult>> {
      try {
        // Validation
        if (!data.responses || data.responses.length === 0) {
          return {
            success: false,
            error: "Invalid data: responses array cannot be empty",
          };
        }

        // Submit responses (repo handles transaction)
        const result = await repo.submitSurveyResponses(
          data.surveyId,
          data.userId,
          data.responses,
          db,
        );

        return { success: true, data: result };
      } catch (error) {
        console.error("Error submitting responses:", error);
        return { success: false, error: "Failed to submit responses" };
      }
    },

    /**
     * Get user's submission history for a survey
     */
    async getUserSubmissionHistory(
      surveyId: string,
      userId: string,
    ): Promise<ServiceResult<SubmissionHistory>> {
      try {
        const submissions = await repo.getUserSubmissions(surveyId, userId);

        return {
          success: true,
          data: {
            surveyId,
            userId,
            submissions,
          },
        };
      } catch (error) {
        console.error("Error getting submission history:", error);
        return { success: false, error: "Failed to get submission history" };
      }
    },
  };
}

// Export type for testing
export type SurveysService = ReturnType<typeof makeSurveysService>;
