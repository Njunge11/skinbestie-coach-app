// Types and Zod schemas for consumer app dashboard API
import { z } from "zod";

// Request validation schema
export const getDashboardRequestSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
});

// Goal schema for response
export const goalSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  complete: z.boolean(),
  completedAt: z.date().nullable(),
  order: z.number(),
});

// Routine item schema for response (today's routine with completion status)
export const routineItemSchema = z.object({
  id: z.string().uuid(),
  routineStep: z.string(),
  productName: z.string(),
  productUrl: z.string().nullable(),
  instructions: z.string(),
  timeOfDay: z.enum(["morning", "evening"]),
  order: z.number(),
  status: z.enum(["pending", "completed", "missed", "late"]),
  completedAt: z.date().nullable(),
});

// Catchup step schema (previous days' pending steps within grace period)
export const catchupStepSchema = z.object({
  id: z.string().uuid(),
  routineStep: z.string(),
  productName: z.string(),
  productUrl: z.string().nullable(),
  instructions: z.string(),
  timeOfDay: z.enum(["morning", "evening"]),
  order: z.number(),
  status: z.enum(["pending", "completed", "missed", "late"]),
  completedAt: z.date().nullable(),
  scheduledDate: z.date(),
  gracePeriodEnd: z.date(),
});

// Routine product schema (for general routine viewing)
export const routineProductSchema = z.object({
  id: z.string().uuid(),
  routineStep: z.string(),
  productName: z.string(),
  productUrl: z.string().nullable(),
  instructions: z.string(),
  frequency: z.enum(["daily", "2x per week", "3x per week", "specific_days"]),
  days: z.array(z.string()).nullable(),
  timeOfDay: z.enum(["morning", "evening"]),
  order: z.number(),
});

// Routine schema for response (general routine with products grouped by time of day)
export const routineSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  startDate: z.date(),
  endDate: z.date().nullable(),
  productPurchaseInstructions: z.string().nullable(),
  morning: z.array(routineProductSchema),
  evening: z.array(routineProductSchema),
});

// Main response schema
export const dashboardResponseSchema = z.object({
  user: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    phoneNumber: z.string(),
    dateOfBirth: z.date(),
    nickname: z.string().nullable(),
    skinType: z.array(z.string()).nullable(),
    concerns: z.array(z.string()).nullable(),
    hasAllergies: z.boolean().nullable(),
    allergyDetails: z.string().nullable(),
    isSubscribed: z.boolean().nullable(),
    occupation: z.string().nullable(),
    bio: z.string().nullable(),
    timezone: z.string(),
  }),
  setupProgress: z.object({
    percentage: z.number().min(0).max(100),
    completed: z.number().min(0).max(4),
    total: z.number(),
    steps: z.object({
      hasCompletedSkinTest: z.boolean(),
      hasPublishedGoals: z.boolean(),
      hasPublishedRoutine: z.boolean(),
      hasCompletedBooking: z.boolean(),
    }),
  }),
  todayRoutine: z.array(routineItemSchema).nullable(),
  catchupSteps: z.array(catchupStepSchema).nullable(),
  routine: routineSchema.nullable(),
  goals: z.array(goalSchema).nullable(),
  goalsAcknowledgedByClient: z.boolean(),
});

// Type exports
export type GetDashboardRequest = z.infer<typeof getDashboardRequestSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type RoutineItem = z.infer<typeof routineItemSchema>;
export type CatchupStep = z.infer<typeof catchupStepSchema>;
export type RoutineProduct = z.infer<typeof routineProductSchema>;
export type Routine = z.infer<typeof routineSchema>;
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
