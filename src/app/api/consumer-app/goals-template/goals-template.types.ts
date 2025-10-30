// Types and Zod schemas for consumer app goals template API
import { z } from "zod";

// PATCH request schema - all fields optional for partial updates
export const patchGoalsTemplateRequestSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  goalsAcknowledgedByClient: z.boolean().optional(),
  status: z.enum(["published", "unpublished"]).optional(),
});

// Response schema
export const patchGoalsTemplateResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    status: z.enum(["published", "unpublished"]),
    goalsAcknowledgedByClient: z.boolean(),
    updatedAt: z.date(),
  }),
});

// Type exports
export type PatchGoalsTemplateRequest = z.infer<
  typeof patchGoalsTemplateRequestSchema
>;
export type PatchGoalsTemplateResponse = z.infer<
  typeof patchGoalsTemplateResponseSchema
>;
