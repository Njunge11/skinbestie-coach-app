/**
 * Centralized database type definitions
 *
 * Pattern: Use InferSelectModel as the single source of truth,
 * then derive specific view models using Pick/Omit.
 *
 * Benefits:
 * - Schema changes automatically propagate
 * - Components get exactly what they need
 * - No manual type duplication
 * - Compile-time safety
 */

import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import * as schema from "./schema";

// ============================================================================
// BASE ROW TYPES (Single Source of Truth)
// ============================================================================

export type UserProfileRow = InferSelectModel<typeof schema.userProfiles>;
export type UserProfileInsert = InferInsertModel<typeof schema.userProfiles>;

export type UserRow = InferSelectModel<typeof schema.users>;
export type UserInsert = InferInsertModel<typeof schema.users>;

export type AdminRow = InferSelectModel<typeof schema.admins>;
export type AdminInsert = InferInsertModel<typeof schema.admins>;

export type SkinGoalsTemplateRow = InferSelectModel<
  typeof schema.skinGoalsTemplate
>;
export type SkinGoalsTemplateInsert = InferInsertModel<
  typeof schema.skinGoalsTemplate
>;

export type SkincareGoalRow = InferSelectModel<typeof schema.skincareGoals>;
export type SkincareGoalInsert = InferInsertModel<typeof schema.skincareGoals>;

export type SkincareRoutineRow = InferSelectModel<
  typeof schema.skincareRoutines
>;
export type SkincareRoutineInsert = InferInsertModel<
  typeof schema.skincareRoutines
>;

export type SkincareRoutineProductRow = InferSelectModel<
  typeof schema.skincareRoutineProducts
>;
export type SkincareRoutineProductInsert = InferInsertModel<
  typeof schema.skincareRoutineProducts
>;

export type RoutineStepCompletionRow = InferSelectModel<
  typeof schema.routineStepCompletions
>;
export type RoutineStepCompletionInsert = InferInsertModel<
  typeof schema.routineStepCompletions
>;

export type ProgressPhotoRow = InferSelectModel<typeof schema.progressPhotos>;
export type ProgressPhotoInsert = InferInsertModel<
  typeof schema.progressPhotos
>;

export type RoutineTemplateRow = InferSelectModel<
  typeof schema.routineTemplates
>;
export type RoutineTemplateInsert = InferInsertModel<
  typeof schema.routineTemplates
>;

export type RoutineTemplateProductRow = InferSelectModel<
  typeof schema.routineTemplateProducts
>;
export type RoutineTemplateProductInsert = InferInsertModel<
  typeof schema.routineTemplateProducts
>;

export type CoachNoteRow = InferSelectModel<typeof schema.coachNotes>;
export type CoachNoteInsert = InferInsertModel<typeof schema.coachNotes>;

// ============================================================================
// VIEW MODELS (Component-Specific Types)
// ============================================================================

/**
 * For subscriber table/list views
 * Only includes fields displayed in the table
 */
export type SubscriberTableRow = Pick<
  UserProfileRow,
  | "id"
  | "email"
  | "firstName"
  | "lastName"
  | "isCompleted"
  | "hasCompletedSkinTest"
  | "hasCompletedBooking"
  | "completedSteps"
  | "createdAt"
  | "updatedAt"
>;

/**
 * For user profile cards/small displays
 */
export type UserProfileCard = Pick<
  UserProfileRow,
  "id" | "firstName" | "lastName" | "email" | "nickname"
>;

/**
 * For dashboard user display
 */
export type DashboardUser = Pick<
  UserProfileRow,
  "id" | "firstName" | "lastName" | "email" | "nickname" | "skinType"
>;

/**
 * For profile form editing
 * Excludes system-managed fields
 */
export type ProfileFormData = Omit<
  UserProfileRow,
  "id" | "userId" | "createdAt" | "updatedAt"
>;

/**
 * For API responses - excludes sensitive internal fields
 */
export type UserProfilePublic = Omit<
  UserProfileRow,
  "userId" // Internal FK
>;

/**
 * For admin views - includes more fields but not sensitive ones
 */
export type UserProfileAdmin = Omit<
  UserProfileRow,
  never // Admins can see everything
>;

// ============================================================================
// API DTOs (Data Transfer Objects)
// ============================================================================

/**
 * Consumer app dashboard response user data
 */
export type ConsumerDashboardUser = Pick<
  UserProfileRow,
  "firstName" | "lastName" | "email" | "nickname" | "skinType"
>;

/**
 * Profile update request (all fields optional for partial updates)
 */
export type ProfileUpdateData = Partial<
  Omit<UserProfileRow, "id" | "userId" | "createdAt" | "updatedAt">
>;

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Make all fields optional except the specified keys
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Make specified fields required in a partial type
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
