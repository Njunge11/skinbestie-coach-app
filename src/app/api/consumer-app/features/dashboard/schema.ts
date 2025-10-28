import { z } from "zod";

/**
 * Request Schemas
 */

// Query parameters for dashboard endpoint
export const DashboardRequestSchema = z.object({
  userId: z.string().uuid().optional(),
  email: z.string().email().optional(),
}).refine(
  (data) => data.userId || data.email,
  {
    message: "Either userId or email must be provided",
  }
);

/**
 * Response Schemas
 */

// Profile basics schema
const ProfileSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  completedSkinTest: z.boolean(),
  publishedSkinGoals: z.boolean(),
  publishedSkinCareRoutine: z.boolean(),
  hasCompletedBooking: z.boolean().nullable(),
});

// Goal schema
const GoalSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  timeframe: z.string(),
  complete: z.boolean(),
  order: z.number(),
});

// Routine product schema
const RoutineProductSchema = z.object({
  id: z.string().uuid(),
  routineStep: z.string(),
  productName: z.string(),
  productUrl: z.string().url().nullable(),
  instructions: z.string(),
  frequency: z.enum(["daily", "2x per week", "3x per week", "specific_days"]),
  days: z.array(z.string()).nullable(),
  timeOfDay: z.enum(["morning", "evening"]),
  order: z.number(),
});

// Today's routine schema
const TodayRoutineSchema = z.object({
  morning: z.array(RoutineProductSchema),
  evening: z.array(RoutineProductSchema),
});

// Complete dashboard response schema
export const DashboardResponseSchema = z.object({
  profile: ProfileSchema,
  setupProgress: z.number().min(0).max(100),
  todayRoutine: TodayRoutineSchema.nullable(),
  goals: z.array(GoalSchema).nullable(),
});

/**
 * Type exports
 */
export type DashboardRequest = z.infer<typeof DashboardRequestSchema>;
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
export type Goal = z.infer<typeof GoalSchema>;
export type RoutineProduct = z.infer<typeof RoutineProductSchema>;
export type TodayRoutine = z.infer<typeof TodayRoutineSchema>;