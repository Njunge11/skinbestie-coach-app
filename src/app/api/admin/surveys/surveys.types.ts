// Types and Zod schemas for admin surveys API

import { z } from "zod";

// ==========================================
// Request Schemas
// ==========================================

// Question schema (nested in survey creation)
export const questionSchema = z.object({
  questionText: z.string().min(1, "Question text is required"),
  questionType: z.enum(["yes_no", "freehand"]),
  helperText: z.string().nullable().optional(),
  isRequired: z.boolean().default(true),
  order: z.number().int().min(1),
});

// Create survey request
export const createSurveyRequestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  createdBy: z.string().uuid("Valid admin UUID required"),
  questions: z.array(questionSchema).default([]),
});

// Add questions request
export const addQuestionsRequestSchema = z.object({
  questions: z
    .array(questionSchema)
    .min(1, "At least one question is required"),
});

// ==========================================
// Response Schemas
// ==========================================

// Question response
export const questionResponseSchema = z.object({
  id: z.string().uuid(),
  surveyId: z.string().uuid(),
  questionText: z.string(),
  questionType: z.enum(["yes_no", "freehand"]),
  helperText: z.string().nullable(),
  isRequired: z.boolean(),
  order: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Survey response
export const surveyResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(["draft", "published", "archived"]),
  createdBy: z.string().uuid(),
  updatedBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  questions: z.array(questionResponseSchema),
});

// ==========================================
// TypeScript Types
// ==========================================

export type CreateSurveyRequest = z.infer<typeof createSurveyRequestSchema>;
export type AddQuestionsRequest = z.infer<typeof addQuestionsRequestSchema>;
export type QuestionResponse = z.infer<typeof questionResponseSchema>;
export type SurveyResponse = z.infer<typeof surveyResponseSchema>;
