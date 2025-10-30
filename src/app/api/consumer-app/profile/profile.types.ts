// Types and Zod schemas for consumer app profile API
import { z } from "zod";

// PATCH request schema - all fields optional for partial updates
export const patchProfileRequestSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  // Basic info
  nickname: z.string().optional(),
  firstName: z.string().min(1).max(120).optional(),
  lastName: z.string().min(1).max(120).optional(),
  email: z.string().email().max(255).optional(),
  phoneNumber: z.string().min(5).max(32).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  // Skin data
  skinType: z.array(z.string()).optional(),
  concerns: z.array(z.string()).optional(),
  hasAllergies: z.boolean().optional(),
  allergyDetails: z.string().optional(),
  // Profile
  occupation: z.string().optional(),
  bio: z.string().optional(),
  timezone: z.string().optional(),
  // Onboarding flags
  hasCompletedSkinTest: z.boolean().optional(),
  hasCompletedBooking: z.boolean().optional(),
  isSubscribed: z.boolean().optional(),
  // Tracking
  completedSteps: z.array(z.string()).optional(),
  isCompleted: z.boolean().optional(),
  completedAt: z.string().datetime().optional(),
});

// Response schema
export const patchProfileResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.string().uuid(),
    userId: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    nickname: z.string().nullable(),
    phoneNumber: z.string(),
    updatedAt: z.date(),
  }),
});

// Type exports
export type PatchProfileRequest = z.infer<typeof patchProfileRequestSchema>;
export type PatchProfileResponse = z.infer<typeof patchProfileResponseSchema>;
