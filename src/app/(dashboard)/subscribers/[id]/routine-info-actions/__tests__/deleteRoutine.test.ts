import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { deleteRoutine, type RoutineDeps } from "../actions";
import { makeRoutineRepo } from "../routine.repo";
import { makeUserProfileRepo } from "../../profile-header-actions/user-profile.repo";
import {
  createTestDatabase,
  cleanupTestDatabase,
  type TestDatabase,
} from "@/test/db-helper";
import * as schema from "@/lib/db/schema";
import type { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";

/**
 * Delete Routine - Unit Tests (PGlite)
 *
 * Tests that deleteRoutine:
 * 1. Deletes the routine and resets user profile flags (productsReceived, routineStartDateSet)
 * 2. Returns error when routine not found
 */
describe("deleteRoutine - Unit Tests (PGlite)", () => {
  let db: TestDatabase;
  let client: PGlite;
  let deps: RoutineDeps;

  // Test UUIDs
  const routineId = "750e8400-e29b-41d4-a716-446655440001";
  const user1Id = "550e8400-e29b-41d4-a716-446655440000";
  const product1Id = "850e8400-e29b-41d4-a716-446655440001";

  const fixedNow = new Date("2025-10-31T10:00:00.000Z");

  beforeEach(async () => {
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;

    deps = {
      repo: makeRoutineRepo({ db }),
      userProfileRepo: makeUserProfileRepo({ db }),
      db: db,
      now: () => fixedNow,
    };

    // Seed test user with flags set to true
    await db.insert(schema.userProfiles).values({
      id: user1Id,
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      phoneNumber: "+1234567890",
      dateOfBirth: new Date("1990-01-01"),
      timezone: "America/New_York",
      productsReceived: true,
      routineStartDateSet: true,
    });
  });

  afterEach(async () => {
    await cleanupTestDatabase(client);
  });

  it("deletes routine and resets user profile flags", async () => {
    // GIVEN: User has routine with products
    await db.insert(schema.skincareRoutines).values({
      id: routineId,
      userProfileId: user1Id,
      name: "Morning Routine",
      startDate: new Date("2025-10-31"),
      endDate: null,
      status: "published",
    });

    await db.insert(schema.skincareRoutineProducts).values({
      id: product1Id,
      routineId,
      userProfileId: user1Id,
      routineStep: "cleanse",
      productName: "Cleanser",
      instructions: "Apply to face",
      frequency: "daily",
      days: null,
      timeOfDay: "morning",
      order: 1,
    });

    await db.insert(schema.routineStepCompletions).values({
      routineProductId: product1Id,
      userProfileId: user1Id,
      scheduledDate: new Date("2025-10-31"),
      scheduledTimeOfDay: "morning",
      onTimeDeadline: new Date("2025-10-31T12:00:00Z"),
      gracePeriodEnd: new Date("2025-10-31T18:00:00Z"),
      status: "pending",
    });

    // Verify flags are true before deletion
    const userBefore = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.id, user1Id));
    expect(userBefore[0].productsReceived).toBe(true);
    expect(userBefore[0].routineStartDateSet).toBe(true);

    // WHEN: Delete routine
    const result = await deleteRoutine(routineId, deps);

    // THEN: Deletion succeeds
    expect(result.success).toBe(true);

    // Routine is deleted
    const routines = await db
      .select()
      .from(schema.skincareRoutines)
      .where(eq(schema.skincareRoutines.id, routineId));
    expect(routines).toHaveLength(0);

    // Products are cascade-deleted
    const products = await db
      .select()
      .from(schema.skincareRoutineProducts)
      .where(eq(schema.skincareRoutineProducts.routineId, routineId));
    expect(products).toHaveLength(0);

    // Completions are cascade-deleted
    const completions = await db
      .select()
      .from(schema.routineStepCompletions)
      .where(eq(schema.routineStepCompletions.userProfileId, user1Id));
    expect(completions).toHaveLength(0);

    // User profile flags are reset to false
    const userAfter = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.id, user1Id));
    expect(userAfter[0].productsReceived).toBe(false);
    expect(userAfter[0].routineStartDateSet).toBe(false);
  });

  it("returns error when routine not found", async () => {
    const nonExistentId = "750e8400-e29b-41d4-a716-999999999999";

    // WHEN: Try to delete non-existent routine
    const result = await deleteRoutine(nonExistentId, deps);

    // THEN: Returns not found error
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Routine not found");
    }

    // User profile flags should NOT be changed
    const userAfter = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.id, user1Id));
    expect(userAfter[0].productsReceived).toBe(true);
    expect(userAfter[0].routineStartDateSet).toBe(true);
  });

  it("returns error when routine ID is invalid format", async () => {
    // WHEN: Try to delete with invalid UUID format
    const result = await deleteRoutine("invalid-id-format", deps);

    // THEN: Returns validation error
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid data");
    }

    // User profile flags should NOT be changed
    const userAfter = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.id, user1Id));
    expect(userAfter[0].productsReceived).toBe(true);
    expect(userAfter[0].routineStartDateSet).toBe(true);
  });

  it("handles repository errors gracefully", async () => {
    // GIVEN: Routine exists
    await db.insert(schema.skincareRoutines).values({
      id: routineId,
      userProfileId: user1Id,
      name: "Test Routine",
      startDate: new Date("2025-10-31"),
      endDate: null,
      status: "draft",
    });

    // GIVEN: Corrupted database that will cause transaction to fail
    // Simulate by dropping the user_profiles table which will cause FK constraint violation
    await client.exec("DROP TABLE user_profiles CASCADE");

    // WHEN: Try to delete routine
    const result = await deleteRoutine(routineId, deps);

    // THEN: Returns generic error
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to delete routine");
    }
  });
});
