// Types for completion endpoint
import { z } from "zod";

// Request validation schemas
export const updateCompletionRequestSchema = z
  .object({
    userId: z.string().uuid("User ID must be a valid UUID"),
    stepId: z.string().uuid("Step ID must be a valid UUID").optional(),
    stepIds: z
      .array(z.string().uuid("Each step ID must be a valid UUID"))
      .min(1, "stepIds array must contain at least one ID")
      .optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .optional(),
    completed: z.boolean(),
  })
  .refine((data) => data.stepId || data.stepIds || data.date, {
    message: "Either stepId, stepIds, or date must be provided",
  })
  .refine(
    (data) => {
      const provided = [data.stepId, data.stepIds, data.date].filter(Boolean);
      return provided.length === 1;
    },
    {
      message: "Cannot provide multiple of: stepId, stepIds, or date",
    },
  );

export type UpdateCompletionRequest = z.infer<
  typeof updateCompletionRequestSchema
>;
