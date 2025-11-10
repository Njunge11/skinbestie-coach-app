/**
 * Test data factories
 *
 * These factories provide default values for all fields,
 * so adding new fields to the schema won't break tests.
 *
 * Usage:
 *   const user = makeUserProfile({ firstName: 'Jane' });
 *   // All other fields have sensible defaults
 */

import {
  type UserProfile,
  type Admin,
  type RoutineTemplate,
  type RoutineTemplateProduct,
  type SkinGoalsTemplate,
} from "@/lib/db/schema";
import type {
  Client,
  Photo,
  Routine,
  RoutineProduct,
  CoachNote,
  Goal,
} from "@/app/(dashboard)/subscribers/[id]/types";

/**
 * Creates a UserProfile with all fields populated with defaults
 * Override any fields by passing them in the overrides object
 */
export function makeUserProfile(
  overrides: Partial<UserProfile> = {},
): UserProfile {
  const now = new Date();

  return {
    // System fields
    id: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,

    // Basic info
    firstName: "Test",
    lastName: "User",
    email: `test-${Date.now()}@example.com`,
    phoneNumber: "+1234567890",
    dateOfBirth: new Date("1990-01-01"),

    // Profile fields
    nickname: null,
    occupation: null,
    bio: null,
    timezone: "UTC",

    // Skin-related
    skinType: null,
    concerns: null,
    hasAllergies: null,
    allergyDetails: null,

    // Onboarding status
    hasCompletedSkinTest: false,
    hasCompletedBooking: false,
    isSubscribed: null,

    // Completion tracking
    completedSteps: [],
    isCompleted: false,
    completedAt: null,

    // Override with any provided values
    ...overrides,
  };
}

/**
 * Creates a completed user profile (all onboarding done)
 */
export function makeCompletedUserProfile(
  overrides: Partial<UserProfile> = {},
): UserProfile {
  return makeUserProfile({
    hasCompletedSkinTest: true,
    hasCompletedBooking: true,
    isCompleted: true,
    completedAt: new Date(),
    completedSteps: ["PERSONAL", "SKIN_TYPE", "CONCERNS", "BOOKING"],
    ...overrides,
  });
}

/**
 * Creates a user profile with skin data
 */
export function makeUserProfileWithSkinData(
  overrides: Partial<UserProfile> = {},
): UserProfile {
  return makeUserProfile({
    skinType: ["oily", "sensitive"],
    concerns: ["acne", "wrinkles"],
    hasAllergies: false,
    hasCompletedSkinTest: true,
    ...overrides,
  });
}

/**
 * Creates a Client DTO for component tests
 * This is the view model used in subscriber detail pages
 */
export function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: crypto.randomUUID(),
    name: "Test User",
    age: 30,
    email: "test@example.com",
    mobile: "555-1234",
    occupation: "Engineer",
    bio: "Test bio",
    skinType: "normal",
    concerns: [],
    planWeeks: 12,
    currentWeek: 1,
    startDate: new Date().toISOString().split("T")[0],
    hasRoutine: false,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a Photo for component tests
 */
export function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: crypto.randomUUID(),
    weekNumber: 1,
    uploadedAt: new Date(),
    feedback: null,
    imageUrl: "/uploads/test-photo.jpg",
    ...overrides,
  };
}

/**
 * Creates a Routine for component tests
 */
export function makeRoutine(overrides: Partial<Routine> = {}): Routine {
  const startDate = new Date();
  return {
    id: crypto.randomUUID(),
    userProfileId: crypto.randomUUID(),
    name: "Test Routine",
    startDate,
    endDate: null,
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a RoutineProduct for component tests
 */
export function makeRoutineProduct(
  overrides: Partial<RoutineProduct> = {},
): RoutineProduct {
  return {
    id: crypto.randomUUID(),
    routineId: crypto.randomUUID(),
    userProfileId: crypto.randomUUID(),
    routineStep: "cleanse",
    productName: "Test Cleanser",
    productUrl: null,
    instructions: "Apply to damp skin",
    productPurchaseInstructions: null,
    frequency: "daily",
    days: null,
    timeOfDay: "morning",
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a CoachNote for component tests
 */
export function makeCoachNote(overrides: Partial<CoachNote> = {}): CoachNote {
  return {
    id: crypto.randomUUID(),
    userProfileId: crypto.randomUUID(),
    adminId: crypto.randomUUID(),
    content: "Test coach note",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a Goal for component tests
 */
export function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: crypto.randomUUID(),
    templateId: crypto.randomUUID(),
    description: "Test goal",
    timeline: null,
    isPrimaryGoal: false,
    complete: false,
    completedAt: null,
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates an Admin for tests
 */
export function makeAdmin(overrides: Partial<Admin> = {}): Admin {
  return {
    id: crypto.randomUUID(),
    email: `admin-${Date.now()}@example.com`,
    name: "Test Admin",
    passwordHash: null,
    passwordSet: false,
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a RoutineTemplate for tests
 */
export function makeRoutineTemplate(
  overrides: Partial<RoutineTemplate> = {},
): RoutineTemplate {
  return {
    id: crypto.randomUUID(),
    name: "Test Template",
    description: "Test routine template",
    createdBy: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a RoutineTemplateProduct for tests
 */
export function makeRoutineTemplateProduct(
  overrides: Partial<RoutineTemplateProduct> = {},
): RoutineTemplateProduct {
  return {
    id: crypto.randomUUID(),
    templateId: crypto.randomUUID(),
    routineStep: "cleanse",
    productName: "Test Product",
    productUrl: null,
    instructions: "Apply to skin",
    frequency: "daily",
    days: null,
    timeOfDay: "morning",
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a SkinGoalsTemplate for tests
 */
export function makeGoalsTemplate(
  overrides: Partial<SkinGoalsTemplate> = {},
): SkinGoalsTemplate {
  return {
    id: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    status: "unpublished",
    goalsAcknowledgedByClient: false,
    createdBy: crypto.randomUUID(),
    updatedBy: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
