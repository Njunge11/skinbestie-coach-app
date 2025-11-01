import { z } from "zod";

// Base schemas for validation
export const uuidSchema = z.string().uuid();
export const requiredStringSchema = z.string().trim().min(1);
export const dateSchema = z.coerce.date();

// Input schemas - Single source of truth
export const createRoutineInputSchema = z.object({
  name: requiredStringSchema,
  startDate: dateSchema,
  endDate: dateSchema.nullable().optional(),
});

export const updateRoutineInputSchema = z.object({
  name: requiredStringSchema.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.nullable().optional(),
});

export const updateRoutineProductInputSchema = z.object({
  productName: requiredStringSchema.optional(),
  instructions: z.string().optional(),
  frequency: z
    .enum(["daily", "2x per week", "3x per week", "specific_days"])
    .optional(),
  days: z.array(z.string()).nullable().optional(),
  timeOfDay: z.enum(["morning", "evening"]).optional(),
  order: z.number().optional(),
});

// Internal validation schemas (include IDs)
export const createRoutineSchema = z.object({
  userId: uuidSchema,
  name: requiredStringSchema,
  startDate: dateSchema,
  endDate: dateSchema.nullable().optional(),
});

export const updateRoutineSchema = z.object({
  routineId: uuidSchema,
  name: requiredStringSchema.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.nullable().optional(),
});

export const publishRoutineSchema = z.object({
  routineId: uuidSchema,
});

// Derive TypeScript types from schemas (single source of truth)
export type CreateRoutineInput = z.infer<typeof createRoutineInputSchema>;
export type UpdateRoutineInput = z.infer<typeof updateRoutineInputSchema>;
export type UpdateRoutineProductInput = z.infer<
  typeof updateRoutineProductInputSchema
>;
