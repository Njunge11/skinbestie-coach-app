// Types and Zod schemas for consumer app surveys API

import { z } from "zod";

// ==========================================
// Request Schemas
// ==========================================

// Individual response schema
export const responseSchema = z.object({
  questionId: z.string().uuid("Invalid question ID"),
  yesNoAnswer: z.boolean().nullable().optional(),
  freehandAnswer: z.string().nullable().optional(),
});

// Submit responses request
export const submitResponsesRequestSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  responses: z
    .array(responseSchema)
    .min(1, "At least one response is required"),
});

// ==========================================
// Response Schemas
// ==========================================

// Response detail (with question info)
export const responseDetailSchema = z.object({
  questionId: z.string().uuid(),
  questionText: z.string(),
  questionType: z.enum(["yes_no", "freehand"]),
  yesNoAnswer: z.boolean().nullable(),
  freehandAnswer: z.string().nullable(),
});

// Submission schema
export const submissionSchema = z.object({
  submissionId: z.string().uuid(),
  submittedAt: z.date(),
  responses: z.array(responseDetailSchema),
});

// Submit response result
export const submitResponseResultSchema = z.object({
  submissionId: z.string().uuid(),
  submittedAt: z.date(),
  responsesCount: z.number(),
});

// User submission history response
export const submissionHistoryResponseSchema = z.object({
  surveyId: z.string().uuid(),
  userId: z.string().uuid(),
  submissions: z.array(submissionSchema),
});

// Survey for consumer (to answer)
export const consumerSurveyResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  questions: z.array(
    z.object({
      id: z.string().uuid(),
      questionText: z.string(),
      questionType: z.enum(["yes_no", "freehand"]),
      helperText: z.string().nullable(),
      isRequired: z.boolean(),
      order: z.number(),
    }),
  ),
});

// ==========================================
// TypeScript Types
// ==========================================

export type SubmitResponsesRequest = z.infer<
  typeof submitResponsesRequestSchema
>;
export type ResponseDetail = z.infer<typeof responseDetailSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type SubmitResponseResult = z.infer<typeof submitResponseResultSchema>;
export type SubmissionHistoryResponse = z.infer<
  typeof submissionHistoryResponseSchema
>;
export type ConsumerSurveyResponse = z.infer<
  typeof consumerSurveyResponseSchema
>;
