import { db } from "@/lib/db";
import {
  admins,
  userProfiles,
  skincareRoutines,
  skincareRoutineProducts,
  routineTemplates,
  routineTemplateProducts,
} from "@/lib/db/schema";

/**
 * Seeds a user_profile record in the PGlite test database
 */
export async function seedUserProfile(
  id: string,
  overrides: {
    email?: string;
    firstName?: string;
    lastName?: string;
    timezone?: string;
    phoneNumber?: string;
    dateOfBirth?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  } = {}
) {
  const now = new Date();

  return await db.insert(userProfiles).values({
    id,
    email: overrides.email || `user-${id}@example.com`,
    firstName: overrides.firstName || "Test",
    lastName: overrides.lastName || "User",
    phoneNumber: overrides.phoneNumber || "+1234567890",
    dateOfBirth: overrides.dateOfBirth || new Date("1990-01-01"),
    timezone: overrides.timezone || "America/New_York",
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  }).returning();
}

/**
 * Seeds a skincare_routine record in the PGlite test database
 */
export async function seedRoutine(
  id: string,
  userProfileId: string,
  overrides: {
    name?: string;
    startDate?: Date;
    endDate?: Date | null;
    status?: "draft" | "published";
    createdAt?: Date;
    updatedAt?: Date;
  } = {}
) {
  const now = new Date();

  return await db.insert(skincareRoutines).values({
    id,
    userProfileId,
    name: overrides.name || "Test Routine",
    startDate: overrides.startDate || new Date("2025-01-01"),
    endDate: overrides.endDate === undefined ? null : overrides.endDate,
    status: overrides.status || "draft",
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  }).returning();
}

/**
 * Seeds a skincare_routine_products record in the PGlite test database
 */
export async function seedRoutineProduct(
  id: string,
  routineId: string,
  userProfileId: string,
  overrides: {
    routineStep?: string;
    productName?: string;
    productUrl?: string | null;
    instructions?: string;
    frequency?: "daily" | "2x per week" | "3x per week" | "specific_days";
    days?: string[] | null;
    timeOfDay?: "morning" | "evening";
    order?: number;
    createdAt?: Date;
    updatedAt?: Date;
  } = {}
) {
  const now = new Date();

  return await db.insert(skincareRoutineProducts).values({
    id,
    routineId,
    userProfileId,
    routineStep: overrides.routineStep || "Cleanser",
    productName: overrides.productName || "Test Product",
    productUrl: overrides.productUrl === undefined ? null : overrides.productUrl,
    instructions: overrides.instructions || "Apply to face",
    frequency: overrides.frequency || "daily",
    days: overrides.days === undefined ? null : overrides.days,
    timeOfDay: overrides.timeOfDay || "morning",
    order: overrides.order ?? 0,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  }).returning();
}

/**
 * Seeds a routine_template record in the PGlite test database
 */
export async function seedTemplate(
  id: string,
  createdBy: string,
  overrides: {
    name?: string;
    description?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  } = {}
) {
  const now = new Date();

  return await db.insert(routineTemplates).values({
    id,
    name: overrides.name || "Test Template",
    description: overrides.description === undefined ? null : overrides.description,
    createdBy,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  }).returning();
}

/**
 * Seeds a routine_template_products record in the PGlite test database
 */
export async function seedTemplateProduct(
  id: string,
  templateId: string,
  overrides: {
    routineStep?: string;
    productName?: string;
    productUrl?: string | null;
    instructions?: string;
    frequency?: "daily" | "2x per week" | "3x per week" | "specific_days";
    days?: string[] | null;
    timeOfDay?: "morning" | "evening";
    order?: number;
    createdAt?: Date;
    updatedAt?: Date;
  } = {}
) {
  const now = new Date();

  return await db.insert(routineTemplateProducts).values({
    id,
    templateId,
    routineStep: overrides.routineStep || "Cleanser",
    productName: overrides.productName || "Test Product",
    productUrl: overrides.productUrl === undefined ? null : overrides.productUrl,
    instructions: overrides.instructions || "Apply to face",
    frequency: overrides.frequency || "daily",
    days: overrides.days === undefined ? null : overrides.days,
    timeOfDay: overrides.timeOfDay || "morning",
    order: overrides.order ?? 0,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  }).returning();
}
