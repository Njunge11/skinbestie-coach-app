import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  updateRoutine,
  publishRoutine,
  type RoutineDeps,
  type PublishRoutineDeps,
} from "../actions";
import { makeRoutineRepo } from "../routine.repo";
import { makeRoutineProductsRepo } from "../../compliance-actions/routine-products.repo";
import { makeUserProfileRepo as makeComplianceUserProfileRepo } from "../../compliance-actions/user-profile.repo";
import { makeUserProfileRepo } from "../../profile-header-actions/user-profile.repo";
import {
  createTestDatabase,
  cleanupTestDatabase,
  type TestDatabase,
} from "@/test/db-helper";
import * as schema from "@/lib/db/schema";
import type { PGlite } from "@electric-sql/pglite";
import { eq, asc } from "drizzle-orm";

describe("updateRoutine - Future to Today Date Change (PGlite)", () => {
  let db: TestDatabase;
  let client: PGlite;

  // Test UUIDs
  const routineId = "750e8400-e29b-41d4-a716-446655440001";
  const user1Id = "550e8400-e29b-41d4-a716-446655440000";
  const product1Id = "850e8400-e29b-41d4-a716-446655440001";

  // Fixed timestamp: Nov 1, 2025 10:00 AM UTC (today)
  const fixedNow = new Date("2025-11-01T10:00:00.000Z");

  let deps: RoutineDeps;
  let publishDeps: PublishRoutineDeps;

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

    publishDeps = {
      routineRepo: makeRoutineRepo({ db }),
      productRepo: makeRoutineProductsRepo({ db }),
      userRepo: makeComplianceUserProfileRepo({ db }),
      db: db,
      now: () => fixedNow,
    };

    // Seed test user with timezone
    await db.insert(schema.userProfiles).values({
      id: user1Id,
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      phoneNumber: "+1234567890",
      dateOfBirth: new Date("1990-01-01"),
      timezone: "America/New_York", // EST/EDT timezone
    });
  });

  afterEach(async () => {
    await cleanupTestDatabase(client);
  });

  describe("Start date moved from FUTURE to TODAY", () => {
    it("generates missing tasks when start date moves from Nov 15 to Nov 1 (today)", async () => {
      // GIVEN: Published routine starting Nov 15 (future)
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-11-15"), // Future date
        endDate: null,
        status: "draft",
      });

      await db.insert(schema.skincareRoutineProducts).values({
        id: product1Id,
        routineId,
        userProfileId: user1Id,
        routineStep: "cleanse",
        productName: "Cleanse",
        instructions: "Apply to face",
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 1,
      });

      // Publish routine with future start date
      await publishRoutine(routineId, publishDeps);

      // Verify initial tasks start from Nov 15
      const tasksBefore = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id))
        .orderBy(asc(schema.routineStepCompletions.scheduledDate));

      expect(tasksBefore).toHaveLength(60); // Nov 15 → Jan 13, 2026 (60 days)
      expect(tasksBefore[0].scheduledDate).toEqual(new Date("2025-11-15"));

      // WHEN: Move start date BACKWARD to Nov 1 (today)
      const result = await updateRoutine(
        routineId,
        { startDate: new Date("2025-11-01") }, // Today's date
        deps,
      );

      // THEN: Should succeed
      expect(result.success).toBe(true);

      // Should now have tasks from Nov 1 through Dec 30 (60 days from Nov 1)
      const tasksAfter = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id))
        .orderBy(asc(schema.routineStepCompletions.scheduledDate));

      // Should have 60 total tasks: Nov 1 - Dec 30 (60 days)
      expect(tasksAfter).toHaveLength(60);

      // Verify earliest task is now Nov 1 (today)
      expect(tasksAfter[0].scheduledDate).toEqual(new Date("2025-11-01"));

      // Verify latest task is Dec 30 (59 days after Nov 1)
      expect(tasksAfter[tasksAfter.length - 1].scheduledDate).toEqual(
        new Date("2025-12-30"),
      );

      // Verify the gap was filled (Nov 1-14 should exist)
      const nov1to14Tasks = tasksAfter.filter((task) => {
        const date = task.scheduledDate;
        return date >= new Date("2025-11-01") && date <= new Date("2025-11-14");
      });
      expect(nov1to14Tasks).toHaveLength(14); // Nov 1-14 inclusive
    });

    it("generates tasks for the gap period only (preserves existing future tasks)", async () => {
      // GIVEN: Published routine starting Nov 20 (future)
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-11-20"), // Future date
        endDate: new Date("2025-12-10"), // Explicit end date
        status: "draft",
      });

      await db.insert(schema.skincareRoutineProducts).values({
        id: product1Id,
        routineId,
        userProfileId: user1Id,
        routineStep: "moisturize",
        productName: "Moisturise",
        instructions: "Apply after cleansing",
        frequency: "daily",
        days: null,
        timeOfDay: "evening",
        order: 2,
      });

      // Publish routine with future start date
      await publishRoutine(routineId, publishDeps);

      const tasksBefore = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id))
        .orderBy(asc(schema.routineStepCompletions.scheduledDate));

      // Should have 21 tasks: Nov 20 - Dec 10 (21 days inclusive)
      expect(tasksBefore).toHaveLength(21);
      expect(tasksBefore[0].scheduledDate).toEqual(new Date("2025-11-20"));

      // Get a specific future task to verify it's preserved
      const nov25Task = tasksBefore.find(
        (t) =>
          t.scheduledDate.toISOString() ===
          new Date("2025-11-25").toISOString(),
      );
      expect(nov25Task).toBeDefined();

      // WHEN: Move start date to Nov 5
      const result = await updateRoutine(
        routineId,
        { startDate: new Date("2025-11-05") },
        deps,
      );

      // THEN: Should succeed
      expect(result.success).toBe(true);

      const tasksAfter = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id))
        .orderBy(asc(schema.routineStepCompletions.scheduledDate));

      // Should have 36 tasks: Nov 5 - Dec 10 (36 days inclusive)
      expect(tasksAfter).toHaveLength(36);

      // Verify earliest task is Nov 5
      expect(tasksAfter[0].scheduledDate).toEqual(new Date("2025-11-05"));

      // Verify latest task is still Dec 10 (end date)
      expect(tasksAfter[tasksAfter.length - 1].scheduledDate).toEqual(
        new Date("2025-12-10"),
      );

      // Verify the original Nov 25 task was preserved
      const preservedTask = tasksAfter.find(
        (t) =>
          t.scheduledDate.toISOString() ===
          new Date("2025-11-25").toISOString(),
      );
      expect(preservedTask).toBeDefined();
      expect(preservedTask?.id).toBe(nov25Task?.id); // Same task ID

      // Verify gap was filled (Nov 5-19 should exist)
      const gapTasks = tasksAfter.filter((task) => {
        const date = task.scheduledDate;
        return date >= new Date("2025-11-05") && date <= new Date("2025-11-19");
      });
      expect(gapTasks).toHaveLength(15); // Nov 5-19 inclusive
    });

    it("generates tasks respecting non-daily frequency (3x per week)", async () => {
      // GIVEN: Routine with 3x per week frequency, starting Nov 20
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Weekly Routine",
        startDate: new Date("2025-11-20"), // Future Thursday
        endDate: null,
        status: "draft",
      });

      await db.insert(schema.skincareRoutineProducts).values({
        id: product1Id,
        routineId,
        userProfileId: user1Id,
        routineStep: "treat",
        productName: "Treatment",
        instructions: "Apply to problem areas",
        frequency: "3x per week",
        days: ["Monday", "Wednesday", "Friday"],
        timeOfDay: "evening",
        order: 1,
      });

      // Publish with future start date
      await publishRoutine(routineId, publishDeps);

      const tasksBefore = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id))
        .orderBy(asc(schema.routineStepCompletions.scheduledDate));

      // Nov 20 is Thursday, so first task should be Nov 21 (Friday)
      expect(tasksBefore[0].scheduledDate).toEqual(new Date("2025-11-21")); // Friday

      // WHEN: Move start date to Nov 1 (Saturday)
      const result = await updateRoutine(
        routineId,
        { startDate: new Date("2025-11-01") }, // Saturday
        deps,
      );

      // THEN: Should succeed
      expect(result.success).toBe(true);

      const tasksAfter = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id))
        .orderBy(asc(schema.routineStepCompletions.scheduledDate));

      // Verify first task is Nov 3 (Monday - first valid day after Nov 1)
      expect(tasksAfter[0].scheduledDate).toEqual(new Date("2025-11-03")); // Monday

      // Verify tasks only occur on Mon/Wed/Fri
      tasksAfter.forEach((task) => {
        const dayOfWeek = task.scheduledDate.getUTCDay();
        // 1=Monday, 3=Wednesday, 5=Friday
        expect([1, 3, 5]).toContain(dayOfWeek);
      });

      // Verify we have the right number of M/W/F days from Nov 3 to Dec 30
      // Nov has 10 M/W/F (3,5,7,10,12,14,17,19,21,24,26,28)
      // Dec has 13 M/W/F (1,3,5,8,10,12,15,17,19,22,24,26,29)
      // Total: 23 days
      expect(tasksAfter.length).toBeGreaterThanOrEqual(23);
    });

    it("does nothing when start date moves to past (before today)", async () => {
      // GIVEN: Published routine starting Nov 20 (future)
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-11-20"),
        endDate: null,
        status: "draft",
      });

      await db.insert(schema.skincareRoutineProducts).values({
        id: product1Id,
        routineId,
        userProfileId: user1Id,
        routineStep: "cleanse",
        productName: "Cleanse",
        instructions: "Apply to face",
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 1,
      });

      await publishRoutine(routineId, publishDeps);

      const tasksBefore = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasksBefore).toHaveLength(60); // Nov 20 → Jan 18

      // WHEN: Try to move start date to Oct 15 (past, before today Nov 1)
      const result = await updateRoutine(
        routineId,
        { startDate: new Date("2025-10-15") }, // Past date
        deps,
      );

      // THEN: Should succeed but not generate past tasks
      expect(result.success).toBe(true);

      const tasksAfter = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id))
        .orderBy(asc(schema.routineStepCompletions.scheduledDate));

      // Tasks should still start from Nov 20 (no backfilling to Oct 15)
      // System never creates tasks in the past
      expect(tasksAfter[0].scheduledDate).toEqual(new Date("2025-11-20"));
      expect(tasksAfter).toHaveLength(60);
    });
  });
});
