// Shared test setup for routine-steps repo tests
import { beforeEach, afterEach } from "vitest";
import {
  createTestDatabase,
  cleanupTestDatabase,
  type TestDatabase,
} from "@/test/db-helper";
import { makeCompletionRepo } from "../../completion.repo";
import * as schema from "@/lib/db/schema";
import type { PGlite } from "@electric-sql/pglite";

export let db: TestDatabase;
export let client: PGlite;
export let repo: ReturnType<typeof makeCompletionRepo>;

// Test UUIDs
export const authUserId = "350e8400-e29b-41d4-a716-446655440099";
export const authUserId2 = "350e8400-e29b-41d4-a716-446655440098";
export const profileId = "550e8400-e29b-41d4-a716-446655440000";
export const profileId2 = "550e8400-e29b-41d4-a716-446655440001";
export const routineId = "650e8400-e29b-41d4-a716-446655440000";
export const productId1 = "750e8400-e29b-41d4-a716-446655440001";
export const productId2 = "750e8400-e29b-41d4-a716-446655440002";
export const productId3 = "750e8400-e29b-41d4-a716-446655440003";
export const completionId1 = "850e8400-e29b-41d4-a716-446655440001";
export const completionId2 = "850e8400-e29b-41d4-a716-446655440002";
export const completionId3 = "850e8400-e29b-41d4-a716-446655440003";

// Helper to create user profile with all required fields
export async function createUserProfile(
  id: string,
  userId: string,
  email: string,
  timezone = "America/New_York",
) {
  // Generate unique phone number from UUID - use the last segment which varies most
  const phoneDigits = id.replace(/-/g, ""); // Remove all dashes: 550e8400e29b41d4a716446655440000
  // Use last 15 chars to ensure uniqueness (last segment has the unique part)
  const phone = `+${phoneDigits.slice(-15)}`; // Last 15 digits
  await db.insert(schema.userProfiles).values({
    id,
    userId,
    email,
    firstName: "Test",
    lastName: "User",
    phoneNumber: phone,
    dateOfBirth: new Date("1990-01-01"),
    timezone,
  });
}

// Helper to create skincare routine
export async function createRoutine(
  id: string,
  userProfileId: string,
  name = "Test Routine",
) {
  await db.insert(schema.skincareRoutines).values({
    id,
    userProfileId,
    name,
    startDate: new Date("2025-11-01"),
    status: "published",
  });
}

// Helper to create routine product
export async function createRoutineProduct(
  id: string,
  routineId: string,
  userProfileId: string,
  productName = "Test Product",
  order = 1,
) {
  await db.insert(schema.skincareRoutineProducts).values({
    id,
    routineId,
    userProfileId,
    routineStep: "Apply",
    productName,
    instructions: "Use as directed",
    frequency: "daily",
    timeOfDay: "morning",
    order,
  });
}

export function setupCompletionRepoTests() {
  beforeEach(async () => {
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;
    repo = makeCompletionRepo({ db });

    await db.insert(schema.users).values({
      id: authUserId,
      email: "auth@test.com",
      name: "Auth User",
    });

    await db.insert(schema.users).values({
      id: authUserId2,
      email: "auth2@test.com",
      name: "Auth User 2",
    });
  });

  afterEach(async () => {
    await cleanupTestDatabase(client);
  });
}
