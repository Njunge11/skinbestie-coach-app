// Types and Zod schemas for consumer app profile API
import { z } from "zod";
import { UserProfileUpdateSchema } from "@/app/(dashboard)/subscribers/schemas";

// PATCH request schema - reuse shared schema + add userId requirement
export const patchProfileRequestSchema = UserProfileUpdateSchema.extend({
  userId: z.string().uuid("Invalid user ID format"),
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
