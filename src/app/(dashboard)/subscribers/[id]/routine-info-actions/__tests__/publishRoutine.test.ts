import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { publishRoutine, type PublishRoutineDeps } from "../actions";
import { makeRoutineRepo } from "../routine.repo";
import { makeRoutineProductsRepo } from "../../compliance-actions/routine-products.repo";
import { makeUserProfileRepo } from "../../compliance-actions/user-profile.repo";
import {
  createTestDatabase,
  cleanupTestDatabase,
  type TestDatabase,
} from "@/test/db-helper";
import * as schema from "@/lib/db/schema";
import type { PGlite } from "@electric-sql/pglite";
import { addDays } from "date-fns";
import { eq } from "drizzle-orm";

describe("publishRoutine - Integration Tests (60-day window with PGlite)", () => {
  let db: TestDatabase;
  let client: PGlite;

  // Test UUIDs - increment last segment
  const routineId = "750e8400-e29b-41d4-a716-446655440001";
  const user1Id = "550e8400-e29b-41d4-a716-446655440000";
  const product1Id = "850e8400-e29b-41d4-a716-446655440001";
  const product2Id = "850e8400-e29b-41d4-a716-446655440002";

  // Fixed timestamp for deterministic tests
  const fixedNow = new Date("2025-10-31T10:00:00.000Z");

  let deps: PublishRoutineDeps;

  beforeEach(async () => {
    // Create fresh in-memory database for each test
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;

    // Setup dependencies with real repos using test database
    deps = {
      routineRepo: makeRoutineRepo({ db }),
      productRepo: makeRoutineProductsRepo({ db }),
      userRepo: makeUserProfileRepo({ db }),
      db: db,
      now: () => fixedNow,
    };

    // Seed test user with all required NOT NULL fields
    await db.insert(schema.userProfiles).values({
      id: user1Id,
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      phoneNumber: "+1234567890",
      dateOfBirth: new Date("1990-01-01"),
      timezone: "America/New_York",
    });
  });

  afterEach(async () => {
    await cleanupTestDatabase(client);
  });

  describe("Happy path - 60-day window", () => {
    it("generates tasks from start date to 60 days ahead when routine starts today", async () => {
      // GIVEN: Routine starts today
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-31"), // Today
        endDate: null,
        status: "draft",
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

      // WHEN: publishRoutine is called
      const result = await publishRoutine(routineId, deps);

      // THEN: Should generate exactly 60 days of tasks
      expect(result.success).toBe(true);

      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasks).toHaveLength(60); // Oct 31 → Dec 29 (60 days)

      // Verify first and last task dates
      const firstTask = tasks[0];
      const lastTask = tasks[tasks.length - 1];

      expect(firstTask.scheduledDate).toEqual(new Date("2025-10-31"));
      expect(lastTask.scheduledDate).toEqual(new Date("2025-12-29")); // 60 days from Oct 31
    });

    it("generates tasks from today to 60 days ahead when start date is in the past", async () => {
      // GIVEN: Routine start date is in the past
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-01"), // 30 days ago
        endDate: null,
        status: "draft",
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

      // WHEN: publishRoutine is called
      const result = await publishRoutine(routineId, deps);

      // THEN: Should generate tasks from TODAY (Oct 31), not Oct 1
      expect(result.success).toBe(true);

      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasks).toHaveLength(60); // Oct 31 → Dec 29 (60 days from today)

      // Verify first task is today, NOT Oct 1
      const firstTask = tasks[0];
      expect(firstTask.scheduledDate).toEqual(new Date("2025-10-31"));
    });

    it("generates tasks from future start date to 60 days ahead when start date is in future", async () => {
      // GIVEN: Routine starts in the future
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-11-10"), // 10 days in future
        endDate: null,
        status: "draft",
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

      // WHEN: publishRoutine is called
      const result = await publishRoutine(routineId, deps);

      // THEN: Should generate tasks from Nov 10 → Jan 8 (60 days)
      expect(result.success).toBe(true);

      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasks).toHaveLength(60); // 60 tasks starting from Nov 10

      // Verify first and last task dates
      const firstTask = tasks[0];
      const lastTask = tasks[tasks.length - 1];

      expect(firstTask.scheduledDate).toEqual(new Date("2025-11-10"));
      expect(lastTask.scheduledDate).toEqual(new Date("2026-01-08")); // 60 days from Nov 10
    });
  });

  describe("End date boundary", () => {
    it("caps tasks at end date when end date is less than 60 days from start", async () => {
      // GIVEN: Routine with end date only 30 days from start
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-31"),
        endDate: new Date("2025-11-30"), // Only 30 days
        status: "draft",
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

      // WHEN: publishRoutine is called
      const result = await publishRoutine(routineId, deps);

      // THEN: Should generate only 31 days of tasks (Oct 31 - Nov 30 inclusive)
      expect(result.success).toBe(true);

      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasks).toHaveLength(31); // Oct 31 → Nov 30 (31 days), NOT 60

      // Verify last task is Nov 30 (end date)
      const lastTask = tasks[tasks.length - 1];
      expect(lastTask.scheduledDate).toEqual(new Date("2025-11-30"));
    });

    it("generates full 60 days when end date is more than 60 days from start", async () => {
      // GIVEN: Routine with end date 120 days from start
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-31"),
        endDate: addDays(new Date("2025-10-31"), 120), // 120 days
        status: "draft",
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

      // WHEN: publishRoutine is called
      const result = await publishRoutine(routineId, deps);

      // THEN: Should generate 60 days (capped by 60-day window)
      expect(result.success).toBe(true);

      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasks).toHaveLength(60); // Capped at 60, NOT 120

      // Verify last task is 60 days from start
      const lastTask = tasks[tasks.length - 1];
      expect(lastTask.scheduledDate).toEqual(new Date("2025-12-29"));
    });

    it("generates tasks correctly when no end date is provided", async () => {
      // GIVEN: Routine with no end date (indefinite)
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-31"),
        endDate: null, // Indefinite
        status: "draft",
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

      // WHEN: publishRoutine is called
      const result = await publishRoutine(routineId, deps);

      // THEN: Should generate 60 days
      expect(result.success).toBe(true);

      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasks).toHaveLength(60); // Oct 31 → Dec 29
    });
  });

  describe("Edge cases", () => {
    it("handles routine with single product", async () => {
      // GIVEN: Routine with 1 product
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-31"),
        endDate: null,
        status: "draft",
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

      // WHEN: publishRoutine is called
      const result = await publishRoutine(routineId, deps);

      // THEN: Should succeed
      expect(result.success).toBe(true);

      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasks).toHaveLength(60); // 1 product × 60 days
    });

    it("handles routine with multiple products at different times of day", async () => {
      // GIVEN: Routine with 2 products (morning and evening)
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Full Routine",
        startDate: new Date("2025-10-31"),
        endDate: null,
        status: "draft",
      });

      await db.insert(schema.skincareRoutineProducts).values([
        {
          id: product1Id,
          routineId,
          userProfileId: user1Id,
          routineStep: "cleanse",
          productName: "Morning Cleanser",
          instructions: "Apply in AM",
          frequency: "daily",
          days: null,
          timeOfDay: "morning",
          order: 1,
        },
        {
          id: product2Id,
          routineId,
          userProfileId: user1Id,
          routineStep: "moisturize",
          productName: "Night Cream",
          instructions: "Apply in PM",
          frequency: "daily",
          days: null,
          timeOfDay: "evening",
          order: 2,
        },
      ]);

      // WHEN: publishRoutine is called
      const result = await publishRoutine(routineId, deps);

      // THEN: Should generate tasks for both products
      expect(result.success).toBe(true);

      const allTasks = await db.select().from(schema.routineStepCompletions);

      expect(allTasks).toHaveLength(120); // 2 products × 60 days
    });

    it("handles products with different frequencies (daily, 2x/week, specific days)", async () => {
      // GIVEN: Routine with 3 products at different frequencies
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Mixed Routine",
        startDate: new Date("2025-10-31"),
        endDate: null,
        status: "draft",
      });

      await db.insert(schema.skincareRoutineProducts).values([
        {
          id: product1Id,
          routineId,
          userProfileId: user1Id,
          routineStep: "cleanse",
          productName: "Daily Cleanser",
          instructions: "Every day",
          frequency: "daily",
          days: null,
          timeOfDay: "morning",
          order: 1,
        },
        {
          id: product2Id,
          routineId,
          userProfileId: user1Id,
          routineStep: "exfoliate",
          productName: "Exfoliator",
          instructions: "Twice weekly",
          frequency: "2x per week",
          days: ["Monday", "Thursday"],
          timeOfDay: "evening",
          order: 2,
        },
        {
          id: "850e8400-e29b-41d4-a716-446655440003",
          routineId,
          userProfileId: user1Id,
          routineStep: "mask",
          productName: "Face Mask",
          instructions: "Three times weekly",
          frequency: "3x per week",
          days: ["Monday", "Wednesday", "Friday"],
          timeOfDay: "evening",
          order: 3,
        },
      ]);

      // WHEN: publishRoutine is called
      const result = await publishRoutine(routineId, deps);

      // THEN: Should generate correct number of tasks based on frequency
      expect(result.success).toBe(true);

      const allTasks = await db.select().from(schema.routineStepCompletions);

      // Daily: 60 tasks
      // 2x/week (Mon/Thu): ~17 tasks (60 days ÷ 7 days × 2 days ≈ 17)
      // 3x/week (Mon/Wed/Fri): ~26 tasks (60 days ÷ 7 days × 3 days ≈ 26)
      // Total: ~103 tasks
      expect(allTasks.length).toBeGreaterThan(100);
      expect(allTasks.length).toBeLessThan(110);
    });
  });

  describe("Timezone handling", () => {
    it("calculates deadlines in user's timezone (Nairobi UTC+3)", async () => {
      // GIVEN: User in Nairobi timezone
      await db
        .update(schema.userProfiles)
        .set({ timezone: "Africa/Nairobi" })
        .where(eq(schema.userProfiles.id, user1Id));

      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-31"),
        endDate: null,
        status: "draft",
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

      // WHEN: publishRoutine is called
      const result = await publishRoutine(routineId, deps);

      // THEN: Should use Nairobi timezone for deadline calculations
      expect(result.success).toBe(true);

      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id))
        .limit(1);

      const firstTask = tasks[0];
      // Deadline should be noon Nairobi time (09:00 UTC)
      expect(firstTask.onTimeDeadline).toEqual(
        new Date("2025-10-31T09:00:00.000Z"),
      );
    });

    it("calculates deadlines in user's timezone (Los Angeles UTC-8)", async () => {
      // GIVEN: User in Los Angeles timezone
      await db
        .update(schema.userProfiles)
        .set({ timezone: "America/Los_Angeles" })
        .where(eq(schema.userProfiles.id, user1Id));

      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-31"),
        endDate: null,
        status: "draft",
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

      // WHEN: publishRoutine is called
      const result = await publishRoutine(routineId, deps);

      // THEN: Should use Los Angeles timezone for deadline calculations
      expect(result.success).toBe(true);

      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id))
        .limit(1);

      const firstTask = tasks[0];
      // Deadline should be noon LA time (19:00 UTC during standard time, 20:00 during daylight saving)
      // Oct 31, 2025 is during daylight saving time
      expect(firstTask.onTimeDeadline).toEqual(
        new Date("2025-10-31T19:00:00.000Z"),
      );
    });
  });

  describe("Validation", () => {
    it("returns error when routine not found", async () => {
      // GIVEN: Routine doesn't exist (no seed)

      // WHEN: publishRoutine is called
      const result = await publishRoutine(routineId, deps);

      // THEN: Should return error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Routine not found");
      }
    });

    it("returns error when routine already published", async () => {
      // GIVEN: Routine is already published
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-31"),
        endDate: null,
        status: "published", // Already published
      });

      // WHEN: publishRoutine is called
      const result = await publishRoutine(routineId, deps);

      // THEN: Should return error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Routine is already published");
      }
    });

    it("returns error when routine has no products", async () => {
      // GIVEN: Routine exists but has no products
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-31"),
        endDate: null,
        status: "draft",
      });

      // No products inserted

      // WHEN: publishRoutine is called
      const result = await publishRoutine(routineId, deps);

      // THEN: Should return error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Cannot publish routine without products");
      }
    });

    it("returns error when user profile not found", async () => {
      // GIVEN: User profile doesn't exist (cascade deletes routine)
      const nonExistentUserId = "550e8400-e29b-41d4-a716-446655449999";

      // Create a dummy user profile first (to satisfy FK constraint)
      await db.insert(schema.userProfiles).values({
        id: nonExistentUserId,
        email: "nonexistent@test.com",
        firstName: "Non",
        lastName: "Existent",
        phoneNumber: "+9999999999",
        dateOfBirth: new Date("1990-01-01"),
        timezone: "America/New_York",
      });

      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: nonExistentUserId,
        name: "Morning Routine",
        startDate: new Date("2025-10-31"),
        endDate: null,
        status: "draft",
      });

      await db.insert(schema.skincareRoutineProducts).values({
        id: product1Id,
        routineId,
        userProfileId: nonExistentUserId,
        routineStep: "cleanse",
        productName: "Cleanser",
        instructions: "Apply to face",
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 1,
      });

      // Delete the user profile - this CASCADE deletes the routine due to FK constraint
      await db
        .delete(schema.userProfiles)
        .where(eq(schema.userProfiles.id, nonExistentUserId));

      // WHEN: publishRoutine is called
      const result = await publishRoutine(routineId, deps);

      // THEN: Should return "Routine not found" (cascade-deleted by FK constraint)
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Routine not found");
      }
    });
  });
});
