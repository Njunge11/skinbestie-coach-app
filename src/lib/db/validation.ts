/**
 * Centralized validation schemas and API DTOs
 *
 * Pattern: Define Zod schemas here, derive types from centralized types.ts
 * This ensures single source of truth and prevents duplication.
 */

import { z } from "zod";

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const createAdminSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
});

// ============================================================================
// GOALS SCHEMAS
// ============================================================================

export const createGoalSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  description: z.string().min(1, "Description is required"),
  timeline: z.string().optional(),
  isPrimaryGoal: z.boolean().optional().default(false),
});

export const updateGoalSchema = z.object({
  description: z.string().min(1, "Description is required").optional(),
  timeline: z.string().optional(),
  isPrimaryGoal: z.boolean().optional(),
  complete: z.boolean().optional(),
});

export const reorderGoalsSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  goalIds: z
    .array(z.string().uuid("Invalid goal ID format"))
    .min(1, "At least one goal ID is required"),
});

export const acknowledgeGoalsSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  goalsAcknowledgedByClient: z.boolean(),
});
