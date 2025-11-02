// Types for completion endpoint
import { z } from "zod";

// Request validation schemas
export const updateCompletionRequestSchema = z
  .object({
    userId: z.string().uuid("User ID must be a valid UUID"),
    stepId: z.string().uuid("Step ID must be a valid UUID").optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .optional(),
    completed: z.boolean(),
  })
  .refine((data) => data.stepId || data.date, {
    message: "Either stepId or date must be provided",
  })
  .refine((data) => !(data.stepId && data.date), {
    message: "Cannot provide both stepId and date",
  });

export type UpdateCompletionRequest = z.infer<
  typeof updateCompletionRequestSchema
>;
