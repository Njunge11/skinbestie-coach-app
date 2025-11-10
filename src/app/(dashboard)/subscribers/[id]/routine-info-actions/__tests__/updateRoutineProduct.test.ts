import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  updateRoutineProduct,
  publishRoutine,
  type UpdateRoutineProductDeps,
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
import { eq, and } from "drizzle-orm";

describe("updateRoutineProduct - Integration Tests (PGlite)", () => {
  let db: TestDatabase;
  let client: PGlite;

  // Test UUIDs
  const routineId = "750e8400-e29b-41d4-a716-446655440001";
  const user1Id = "550e8400-e29b-41d4-a716-446655440000";
  const product1Id = "850e8400-e29b-41d4-a716-446655440001";
  const product2Id = "850e8400-e29b-41d4-a716-446655440002";

  // Fixed timestamp: Oct 31, 2025 10:00 AM UTC
  const fixedNow = new Date("2025-10-31T10:00:00.000Z");

  let deps: UpdateRoutineProductDeps;
  let publishDeps: PublishRoutineDeps;

  beforeEach(async () => {
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;

    deps = {
      repo: makeRoutineProductsRepo({ db }),
      routineRepo: makeRoutineRepo({ db }),
      userRepo: makeUserProfileRepo({ db }),
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

  describe("Frequency changes", () => {
    it("regenerates tasks when changing from daily to specific days (Mon/Wed/Fri)", async () => {
      // GIVEN: Published routine with daily product
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

      expect(tasksBefore).toHaveLength(60); // Daily: 60 tasks

      // WHEN: Change to Mon/Wed/Fri
      const result = await updateRoutineProduct(
        product1Id,
        {
          frequency: "specific_days",
          days: ["Monday", "Wednesday", "Friday"],
        },
        deps,
      );

      // THEN: Should succeed
      expect(result.success).toBe(true);

      // Tasks regenerated for Mon/Wed/Fri only
      const tasksAfter = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      // Oct 31 → Dec 29 (60 days) = ~26 Mon/Wed/Fri days
      expect(tasksAfter.length).toBeLessThan(60);
      expect(tasksAfter.length).toBeGreaterThanOrEqual(25);
      expect(tasksAfter.length).toBeLessThanOrEqual(27);
    });

    it("regenerates tasks when changing from Mon/Wed/Fri to daily", async () => {
      // GIVEN: Published routine with Mon/Wed/Fri product
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
        frequency: "specific_days",
        days: ["Monday", "Wednesday", "Friday"],
        timeOfDay: "morning",
        order: 1,
      });

      await publishRoutine(routineId, publishDeps);

      const tasksBefore = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasksBefore.length).toBeLessThan(60);

      // WHEN: Change to daily
      await updateRoutineProduct(
        product1Id,
        { frequency: "daily", days: null },
        deps,
      );

      // THEN: Tasks regenerated for every day
      const tasksAfter = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasksAfter).toHaveLength(60); // All days
    });

    it("regenerates tasks when changing days array (Mon/Wed/Fri → Tue/Thu/Sat)", async () => {
      // GIVEN: Published routine with Mon/Wed/Fri product
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
        frequency: "specific_days",
        days: ["Monday", "Wednesday", "Friday"],
        timeOfDay: "morning",
        order: 1,
      });

      await publishRoutine(routineId, publishDeps);

      // WHEN: Change to Tue/Thu/Sat
      await updateRoutineProduct(
        product1Id,
        { days: ["Tuesday", "Thursday", "Saturday"] },
        deps,
      );

      // THEN: Tasks regenerated for new days
      const tasksAfter = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      // Verify tasks are on Tue/Thu/Sat (Nov 1 is Saturday)
      const firstSaturday = tasksAfter.find(
        (t) => t.scheduledDate.getTime() === new Date("2025-11-01").getTime(),
      );
      expect(firstSaturday).toBeDefined();

      const monday = tasksAfter.find(
        (t) => t.scheduledDate.getTime() === new Date("2025-11-03").getTime(),
      );
      expect(monday).toBeUndefined(); // No Monday tasks
    });
  });

  describe("Time of day changes", () => {
    it("regenerates tasks when changing from morning to evening", async () => {
      // GIVEN: Published routine with morning product
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

      expect(tasksBefore.every((t) => t.scheduledTimeOfDay === "morning")).toBe(
        true,
      );

      // WHEN: Change to evening
      await updateRoutineProduct(product1Id, { timeOfDay: "evening" }, deps);

      // THEN: All tasks are evening now
      const tasksAfter = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasksAfter).toHaveLength(60);
      expect(tasksAfter.every((t) => t.scheduledTimeOfDay === "evening")).toBe(
        true,
      );
    });

    it("updates deadlines when changing time of day", async () => {
      // GIVEN: Published routine with morning product
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

      const [taskBefore] = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id))
        .limit(1);

      const morningDeadline = taskBefore.onTimeDeadline;

      // WHEN: Change to evening
      await updateRoutineProduct(product1Id, { timeOfDay: "evening" }, deps);

      // THEN: Deadline changed to evening time
      const [taskAfter] = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(
          and(
            eq(schema.routineStepCompletions.routineProductId, product1Id),
            eq(
              schema.routineStepCompletions.scheduledDate,
              taskBefore.scheduledDate,
            ),
          ),
        )
        .limit(1);

      expect(taskAfter.onTimeDeadline.getTime()).toBeGreaterThan(
        morningDeadline.getTime(),
      );
    });
  });

  describe("Completed task preservation", () => {
    it("keeps completed tasks when regenerating", async () => {
      // GIVEN: Published routine with completed task
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

      // Complete first task
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

      // WHEN: Change frequency
      await updateRoutineProduct(
        product1Id,
        {
          frequency: "specific_days",
          days: ["Monday", "Wednesday", "Friday"],
        },
        deps,
      );

      // THEN: Completed task preserved
      const completedTask = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.id, firstTask.id));

      expect(completedTask).toHaveLength(1);
      expect(completedTask[0].status).toBe("on-time");
      expect(completedTask[0].completedAt).toEqual(
        new Date("2025-10-31T08:00:00.000Z"),
      );
    });

    it("keeps late tasks when regenerating", async () => {
      // GIVEN: Published routine with late task
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

      // Mark task as late
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

      // WHEN: Change time of day
      await updateRoutineProduct(product1Id, { timeOfDay: "evening" }, deps);

      // THEN: Late task preserved
      const lateTask = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.id, firstTask.id));

      expect(lateTask).toHaveLength(1);
      expect(lateTask[0].status).toBe("late");
    });
  });

  describe("Draft routine handling", () => {
    it("does not regenerate tasks when routine is draft", async () => {
      // GIVEN: Draft routine (not published)
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

      // No publishRoutine() call - stays draft

      // WHEN: Update product
      await updateRoutineProduct(
        product1Id,
        {
          frequency: "specific_days",
          days: ["Monday", "Wednesday", "Friday"],
        },
        deps,
      );

      // THEN: No tasks created
      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(tasks).toHaveLength(0);
    });

    it("updates product metadata even when draft", async () => {
      // GIVEN: Draft routine
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

      // WHEN: Update product
      await updateRoutineProduct(product1Id, { timeOfDay: "evening" }, deps);

      // THEN: Product updated
      const [product] = await db
        .select()
        .from(schema.skincareRoutineProducts)
        .where(eq(schema.skincareRoutineProducts.id, product1Id));

      expect(product.timeOfDay).toBe("evening");
    });
  });

  describe("Non-regenerating updates", () => {
    it("does not regenerate tasks when only name changes", async () => {
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

      // WHEN: Update product name only
      await updateRoutineProduct(
        product1Id,
        { productName: "New Cleanser" },
        deps,
      );

      // THEN: Same task IDs (no regeneration)
      const taskIdsAfter = (
        await db
          .select({ id: schema.routineStepCompletions.id })
          .from(schema.routineStepCompletions)
          .where(eq(schema.routineStepCompletions.routineProductId, product1Id))
      ).map((t) => t.id);

      expect(taskIdsAfter).toEqual(taskIdsBefore);
    });

    it("does not regenerate tasks when only instructions change", async () => {
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

      // WHEN: Update instructions only
      await updateRoutineProduct(
        product1Id,
        { instructions: "Massage gently into skin" },
        deps,
      );

      // THEN: Same task IDs
      const taskIdsAfter = (
        await db
          .select({ id: schema.routineStepCompletions.id })
          .from(schema.routineStepCompletions)
          .where(eq(schema.routineStepCompletions.routineProductId, product1Id))
      ).map((t) => t.id);

      expect(taskIdsAfter).toEqual(taskIdsBefore);
    });
  });

  describe("Multiple products isolation", () => {
    it("only regenerates tasks for the updated product, not other products", async () => {
      // GIVEN: Routine with 2 products
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: user1Id,
        name: "Morning Routine",
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
          productName: "Cleanse",
          instructions: "Apply to face",
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
          productName: "Moisturise",
          instructions: "Apply to face",
          frequency: "daily",
          days: null,
          timeOfDay: "morning",
          order: 2,
        },
      ]);

      await publishRoutine(routineId, publishDeps);

      const product2TaskIdsBefore = (
        await db
          .select({ id: schema.routineStepCompletions.id })
          .from(schema.routineStepCompletions)
          .where(eq(schema.routineStepCompletions.routineProductId, product2Id))
      ).map((t) => t.id);

      // WHEN: Update product1 frequency
      await updateRoutineProduct(
        product1Id,
        {
          frequency: "specific_days",
          days: ["Monday", "Wednesday", "Friday"],
        },
        deps,
      );

      // THEN: Product2 tasks unchanged
      const product2TaskIdsAfter = (
        await db
          .select({ id: schema.routineStepCompletions.id })
          .from(schema.routineStepCompletions)
          .where(eq(schema.routineStepCompletions.routineProductId, product2Id))
      ).map((t) => t.id);

      expect(product2TaskIdsAfter).toEqual(product2TaskIdsBefore);

      // Product1 tasks regenerated
      const product1Tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      expect(product1Tasks.length).toBeLessThan(60); // Now Mon/Wed/Fri only
    });
  });

  describe("End date handling", () => {
    it("respects routine end date when regenerating", async () => {
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

      // WHEN: Change frequency
      await updateRoutineProduct(
        product1Id,
        {
          frequency: "specific_days",
          days: ["Monday", "Wednesday", "Friday"],
        },
        deps,
      );

      // THEN: No tasks beyond Nov 30
      const tasks = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

      const beyondEndDate = tasks.filter(
        (t) => t.scheduledDate.getTime() > new Date("2025-11-30").getTime(),
      );

      expect(beyondEndDate).toHaveLength(0);

      // Last task is Nov 28 (Friday)
      const sortedTasks = tasks.sort(
        (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime(),
      );
      expect(sortedTasks[sortedTasks.length - 1].scheduledDate).toEqual(
        new Date("2025-11-28"),
      );
    });
  });
});
