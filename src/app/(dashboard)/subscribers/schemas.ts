import { z } from "zod";

// Step 1 - Create profile with personal details only
export const UserProfileCreateSchema = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
  phoneNumber: z.string().min(5).max(32),
  email: z.string().email().max(255),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Update profile with optional step data
export const UserProfileUpdateSchema = z.object({
  // Step 2
  skinType: z.array(z.string()).optional().nullable(),

  // Step 3
  concerns: z.array(z.string()).optional().nullable(),

  // Step 4
  hasAllergies: z.boolean().optional().nullable(),
  allergyDetails: z.string().optional().nullable(),

  // Step 5
  isSubscribed: z.boolean().optional().nullable(),

  // Step 6
  hasCompletedBooking: z.boolean().optional().nullable(),

  // Tracking
  completedSteps: z.array(z.string()).optional(),
  isCompleted: z.boolean().optional(),
  completedAt: z.string().datetime().optional().nullable(),
});

export type UserProfileCreate = z.infer<typeof UserProfileCreateSchema>;
export type UserProfileUpdate = z.infer<typeof UserProfileUpdateSchema>;

// Pure helper functions
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const normalizePhone = (phone: string) => phone.trim();
export const parseDateOnlyToDate = (yyyyMmDd: string) =>
  new Date(`${yyyyMmDd}T00:00:00Z`);

// Filter types for getUserProfiles
export interface UserProfileFilters {
  searchQuery?: string; // Search by name or email
  completionStatus?: "all" | "completed" | "incomplete"; // Filter by completion
  subscriptionStatus?: "all" | "subscribed" | "not_subscribed"; // Filter by subscription
  dateRange?: "recent" | "this_month" | "last_30_days" | "all"; // Filter by date joined
}

export interface UserProfilePagination {
  page: number; // 0-indexed
  pageSize: number; // Default 20
}

export interface UserProfileSort {
  sortBy?: "name" | "email" | "createdAt"; // Column to sort by
  sortOrder?: "asc" | "desc"; // Sort direction
}
