import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  updateRoutine,
  publishRoutine,
  type RoutineDeps,
  type PublishRoutineDeps,
} from "../actions";
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
import { eq, and, lt, gte } from "drizzle-orm";

describe("updateRoutine - Integration Tests (PGlite)", () => {
  let db: TestDatabase;
  let client: PGlite;

  // Test UUIDs
  const routineId = "750e8400-e29b-41d4-a716-446655440001";
  const user1Id = "550e8400-e29b-41d4-a716-446655440000";
  const product1Id = "850e8400-e29b-41d4-a716-446655440001";

  // Fixed timestamp: Oct 31, 2025 10:00 AM UTC
  const fixedNow = new Date("2025-10-31T10:00:00.000Z");

  let deps: RoutineDeps;
  let publishDeps: PublishRoutineDeps;

  beforeEach(async () => {
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;

    deps = {
      repo: makeRoutineRepo({ db }),
      db: db,
      now: () => fixedNow,
    };

    publishDeps = {
      routineRepo: makeRoutineRepo({ db }),
      productRepo: makeRoutineProductsRepo({ db }),
      userRepo: makeUserProfileRepo({ db }),
      db: db,
      now: () => fixedNow,
    };

    // Seed test user
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

  describe("Start date moved FORWARD", () => {
    it("deletes uncompleted tasks before new start date", async () => {
      // GIVEN: Published routine starting Oct 1
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-01"),
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
      expect(tasksBefore).toHaveLength(60); // Oct 31 → Dec 29

      // WHEN: Move start date FORWARD to Nov 10
      const result = await updateRoutine(
        routineId,
        { startDate: new Date("2025-11-10") },
        deps,
      );

      // THEN: Should succeed
      expect(result.success).toBe(true);

      // Tasks before Nov 10 should be deleted
      const tasksAfter = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      // Should have deleted 10 tasks (Oct 31 - Nov 9)
      expect(tasksAfter).toHaveLength(50); // Nov 10 - Dec 29

      // Verify earliest task is Nov 10
      const earliestTask = tasksAfter[0];
      expect(earliestTask.scheduledDate).toEqual(new Date("2025-11-10"));
    });

    it("keeps completed tasks before new start date (on-time)", async () => {
      // GIVEN: Published routine with completed task
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-01"),
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

      // Mark first task as completed (on-time)
      const [firstTask] = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id))
        .limit(1);

      await db
        .update(schema.routineStepCompletions)
        .set({
          status: "on-time",
          completedAt: new Date("2025-10-31T08:00:00.000Z"),
        })
        .where(eq(schema.routineStepCompletions.id, firstTask.id));

      // WHEN: Move start date FORWARD to Nov 10
      await updateRoutine(
        routineId,
        { startDate: new Date("2025-11-10") },
        deps,
      );

      // THEN: Completed task should still exist
      const completedTask = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(
          and(
            eq(schema.routineStepCompletions.id, firstTask.id),
            eq(schema.routineStepCompletions.status, "on-time"),
          ),
        );

      expect(completedTask).toHaveLength(1);
      expect(completedTask[0].scheduledDate).toEqual(new Date("2025-10-31"));
    });

    it("keeps completed tasks before new start date (late)", async () => {
      // GIVEN: Published routine with late task
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-01"),
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

      // Mark first task as late
      const [firstTask] = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id))
        .limit(1);

      await db
        .update(schema.routineStepCompletions)
        .set({
          status: "late",
          completedAt: new Date("2025-10-31T18:00:00.000Z"),
        })
        .where(eq(schema.routineStepCompletions.id, firstTask.id));

      // WHEN: Move start date forward
      await updateRoutine(
        routineId,
        { startDate: new Date("2025-11-10") },
        deps,
      );

      // THEN: Late task should still exist
      const lateTask = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(
          and(
            eq(schema.routineStepCompletions.id, firstTask.id),
            eq(schema.routineStepCompletions.status, "late"),
          ),
        );

      expect(lateTask).toHaveLength(1);
    });

    it("keeps pending tasks after new start date", async () => {
      // GIVEN: Published routine
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-01"),
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

      // WHEN: Move start date forward to Nov 10
      await updateRoutine(
        routineId,
        { startDate: new Date("2025-11-10") },
        deps,
      );

      // THEN: All remaining tasks should be pending
      const pendingTasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(
          and(
            eq(schema.routineStepCompletions.routineProductId, product1Id),
            gte(
              schema.routineStepCompletions.scheduledDate,
              new Date("2025-11-10"),
            ),
          ),
        );

      expect(pendingTasks.every((t) => t.status === "pending")).toBe(true);
      expect(pendingTasks).toHaveLength(50); // Nov 10 → Dec 29
    });

    it("generates tasks from new start date to 60 days ahead", async () => {
      // GIVEN: Draft routine
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-01"),
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

      // WHEN: Update start date then publish
      await updateRoutine(
        routineId,
        { startDate: new Date("2025-11-10") },
        deps,
      );
      await publishRoutine(routineId, publishDeps);

      // THEN: Tasks from Nov 10 → Jan 8 (60 days)
      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasks).toHaveLength(60);
      expect(tasks[0].scheduledDate).toEqual(new Date("2025-11-10"));
      expect(tasks[59].scheduledDate).toEqual(new Date("2026-01-08"));
    });

    it("caps at end date when end date < new start + 60 days", async () => {
      // GIVEN: Routine with end date
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-01"),
        endDate: new Date("2025-11-30"),
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

      // WHEN: Move start date to Nov 10 (21 days until end)
      await updateRoutine(
        routineId,
        { startDate: new Date("2025-11-10") },
        deps,
      );

      // THEN: Tasks capped at Nov 30
      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasks).toHaveLength(21); // Nov 10 → Nov 30
      expect(tasks[tasks.length - 1].scheduledDate).toEqual(
        new Date("2025-11-30"),
      );
    });
  });

  describe("Edge cases for forward", () => {
    it("handles new start date in the future", async () => {
      // GIVEN: Routine starting Oct 1
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-01"),
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

      // WHEN: Move start to future (Nov 15)
      await updateRoutine(
        routineId,
        { startDate: new Date("2025-11-15") },
        deps,
      );

      // THEN: Tasks before Nov 15 deleted, tasks from Nov 15 onward kept
      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      // Published on Oct 31 created tasks Oct 31 → Dec 29 (60 tasks)
      // Deletes Oct 31 → Nov 14 (15 tasks)
      // Keeps Nov 15 → Dec 29 (45 tasks)
      expect(tasks).toHaveLength(45);

      // Verify earliest task is Nov 15
      const sortedTasks = tasks.sort(
        (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime(),
      );
      expect(sortedTasks[0].scheduledDate).toEqual(new Date("2025-11-15"));
      expect(sortedTasks[sortedTasks.length - 1].scheduledDate).toEqual(
        new Date("2025-12-29"),
      );
    });

    it("handles new start date that moves to today", async () => {
      // GIVEN: Routine starting Oct 1
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-01"),
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

      // WHEN: Move start to today (Oct 31)
      await updateRoutine(
        routineId,
        { startDate: new Date("2025-10-31") },
        deps,
      );

      // THEN: No tasks deleted
      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasks).toHaveLength(60);
    });

    it("handles all tasks being deleted (new start beyond all existing)", async () => {
      // GIVEN: Routine with limited end date
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-01"),
        endDate: new Date("2025-11-30"),
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

      // WHEN: Move start beyond end date
      const result = await updateRoutine(
        routineId,
        { startDate: new Date("2025-12-01") },
        deps,
      );

      // THEN: Success but all tasks deleted
      expect(result.success).toBe(true);

      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasks).toHaveLength(0);
    });
  });

  describe("Start date moved BACKWARD", () => {
    it("does not create tasks in the past", async () => {
      // GIVEN: Routine starting today
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
      const countBefore = tasksBefore.length;

      // WHEN: Backdate to Oct 1
      await updateRoutine(
        routineId,
        { startDate: new Date("2025-10-01") },
        deps,
      );

      // THEN: No new tasks created
      const tasksAfter = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasksAfter).toHaveLength(countBefore);

      // No tasks before today
      const pastTasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(
          and(
            eq(schema.routineStepCompletions.routineProductId, product1Id),
            lt(
              schema.routineStepCompletions.scheduledDate,
              new Date("2025-10-31"),
            ),
          ),
        );

      expect(pastTasks).toHaveLength(0);
    });

    it("keeps existing future tasks unchanged", async () => {
      // GIVEN: Published routine
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

      // WHEN: Backdate
      await updateRoutine(
        routineId,
        { startDate: new Date("2025-10-01") },
        deps,
      );

      // THEN: All tasks unchanged
      const tasksAfter = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasksAfter).toHaveLength(tasksBefore.length);
      expect(tasksAfter[0].scheduledDate).toEqual(tasksBefore[0].scheduledDate);
      expect(tasksAfter[0].id).toBe(tasksBefore[0].id);
    });

    it("does not regenerate anything when backdating", async () => {
      // GIVEN: Published routine
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
        productName: "Cleanse",
        instructions: "Apply to face",
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 1,
      });

      await publishRoutine(routineId, publishDeps);

      const taskIdsBefore = (
        await db
          .select({ id: schema.routineStepCompletions.id })
          .from(schema.routineStepCompletions)
          .where(eq(schema.routineStepCompletions.routineProductId, product1Id))
      ).map((t) => t.id);

      // WHEN: Backdate
      await updateRoutine(
        routineId,
        { startDate: new Date("2025-10-15") },
        deps,
      );

      // THEN: Exact same task IDs
      const taskIdsAfter = (
        await db
          .select({ id: schema.routineStepCompletions.id })
          .from(schema.routineStepCompletions)
          .where(eq(schema.routineStepCompletions.routineProductId, product1Id))
      ).map((t) => t.id);

      expect(taskIdsAfter).toEqual(taskIdsBefore);
    });
  });

  describe("End date moved EARLIER", () => {
    it("deletes uncompleted tasks beyond new end date", async () => {
      // GIVEN: Published routine with no end date
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
        productName: "Cleanse",
        instructions: "Apply to face",
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 1,
      });

      await publishRoutine(routineId, publishDeps);

      // WHEN: Set end date to Nov 30
      await updateRoutine(routineId, { endDate: new Date("2025-11-30") }, deps);

      // THEN: Tasks after Nov 30 deleted
      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasks).toHaveLength(31); // Oct 31 → Nov 30
      expect(tasks[tasks.length - 1].scheduledDate).toEqual(
        new Date("2025-11-30"),
      );
    });

    it("keeps completed tasks beyond new end date", async () => {
      // GIVEN: Routine with completed future task
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
        productName: "Cleanse",
        instructions: "Apply to face",
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 1,
      });

      await publishRoutine(routineId, publishDeps);

      // Mark last task as completed
      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      const lastTask = tasks[tasks.length - 1];

      await db
        .update(schema.routineStepCompletions)
        .set({
          status: "on-time",
          completedAt: new Date("2025-12-29T08:00:00.000Z"),
        })
        .where(eq(schema.routineStepCompletions.id, lastTask.id));

      // WHEN: Set end date to Nov 30 (before Dec 29)
      await updateRoutine(routineId, { endDate: new Date("2025-11-30") }, deps);

      // THEN: Completed task still exists
      const completedTask = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.id, lastTask.id));

      expect(completedTask).toHaveLength(1);
      expect(completedTask[0].status).toBe("on-time");
    });

    it("keeps uncompleted tasks before new end date", async () => {
      // GIVEN: Published routine
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
        productName: "Cleanse",
        instructions: "Apply to face",
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 1,
      });

      await publishRoutine(routineId, publishDeps);

      // WHEN: Set end date to Nov 30
      await updateRoutine(routineId, { endDate: new Date("2025-11-30") }, deps);

      // THEN: Tasks before Nov 30 remain
      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(
          and(
            eq(schema.routineStepCompletions.routineProductId, product1Id),
            lt(
              schema.routineStepCompletions.scheduledDate,
              new Date("2025-11-30"),
            ),
          ),
        );

      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.every((t) => t.status === "pending")).toBe(true);
    });

    it("handles end date moved to before today (deletes all future tasks)", async () => {
      // GIVEN: Published routine
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
        productName: "Cleanse",
        instructions: "Apply to face",
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 1,
      });

      await publishRoutine(routineId, publishDeps);

      // WHEN: Set end date to yesterday (Oct 30)
      await updateRoutine(routineId, { endDate: new Date("2025-10-30") }, deps);

      // THEN: All tasks deleted
      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasks).toHaveLength(0);
    });

    it("handles end date moved to today exactly", async () => {
      // GIVEN: Published routine
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
        productName: "Cleanse",
        instructions: "Apply to face",
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 1,
      });

      await publishRoutine(routineId, publishDeps);

      // WHEN: Set end date to today (Oct 31)
      await updateRoutine(routineId, { endDate: new Date("2025-10-31") }, deps);

      // THEN: Only today's task remains
      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasks).toHaveLength(1);
      expect(tasks[0].scheduledDate).toEqual(new Date("2025-10-31"));
    });
  });

  describe("End date moved LATER", () => {
    it("generates tasks for gap between old end and new end (within 60-day cap)", async () => {
      // GIVEN: Routine with end date Nov 15
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-31"),
        endDate: new Date("2025-11-15"),
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

      expect(tasksBefore).toHaveLength(16); // Oct 31 → Nov 15

      // WHEN: Extend end date to Nov 30
      await updateRoutine(routineId, { endDate: new Date("2025-11-30") }, deps);

      // THEN: Gap filled (Nov 16 → Nov 30)
      const tasksAfter = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasksAfter).toHaveLength(31); // Oct 31 → Nov 30
      expect(tasksAfter[tasksAfter.length - 1].scheduledDate).toEqual(
        new Date("2025-11-30"),
      );
    });

    it("respects 60-day cap when extending end date far into future", async () => {
      // GIVEN: Routine with end date Nov 30
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-31"),
        endDate: new Date("2025-11-30"),
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

      // WHEN: Extend end date to Mar 1 (way beyond 60 days)
      await updateRoutine(routineId, { endDate: new Date("2026-03-01") }, deps);

      // THEN: Only 60 days total (capped)
      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasks).toHaveLength(60); // Oct 31 → Dec 29
      expect(tasks[tasks.length - 1].scheduledDate).toEqual(
        new Date("2025-12-29"),
      );
    });

    it("handles extending indefinite routine (no end date → has end date)", async () => {
      // GIVEN: Routine with no end date (already at 60-day cap)
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
        productName: "Cleanse",
        instructions: "Apply to face",
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 1,
      });

      await publishRoutine(routineId, publishDeps);

      // WHEN: Set end date within 60-day window
      await updateRoutine(routineId, { endDate: new Date("2025-11-20") }, deps);

      // THEN: Tasks trimmed to Nov 20
      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasks).toHaveLength(21); // Oct 31 → Nov 20
      expect(tasks[tasks.length - 1].scheduledDate).toEqual(
        new Date("2025-11-20"),
      );
    });

    it("generates no new tasks when old end date was at 60-day cap", async () => {
      // GIVEN: Routine at 60-day cap
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-31"),
        endDate: new Date("2025-12-29"), // Exactly 60 days
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

      expect(tasksBefore).toHaveLength(60);

      // WHEN: Extend end date to Jan 15
      await updateRoutine(routineId, { endDate: new Date("2026-01-15") }, deps);

      // THEN: Still 60 tasks (no new ones)
      const tasksAfter = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasksAfter).toHaveLength(60);
    });
  });

  describe("End date set to null - indefinite", () => {
    it("extends tasks to 60-day cap from today", async () => {
      // GIVEN: Routine with end date Nov 15
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
        startDate: new Date("2025-10-31"),
        endDate: new Date("2025-11-15"),
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

      // WHEN: Remove end date (set to null)
      await updateRoutine(routineId, { endDate: null }, deps);

      // THEN: Tasks extended to 60-day cap
      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasks).toHaveLength(60); // Oct 31 → Dec 29
      expect(tasks[tasks.length - 1].scheduledDate).toEqual(
        new Date("2025-12-29"),
      );
    });
  });
});
