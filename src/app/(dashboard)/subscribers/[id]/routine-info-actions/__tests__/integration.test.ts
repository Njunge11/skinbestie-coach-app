import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  publishRoutine,
  updateRoutine,
  updateRoutineProduct,
  type PublishRoutineDeps,
  type RoutineDeps,
  type UpdateRoutineProductDeps,
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
import { eq } from "drizzle-orm";

/**
 * Integration tests for complex scenarios combining multiple operations
 *
 * These tests verify that the system correctly handles:
 * 1. Multiple updates in sequence
 * 2. Combinations of routine and product updates
 * 3. Complex real-world workflows
 */
describe("Routine System - Complex Integration Tests (PGlite)", () => {
  let db: TestDatabase;
  let client: PGlite;

  // Test UUIDs
  const routineId = "750e8400-e29b-41d4-a716-446655440001";
  const user1Id = "550e8400-e29b-41d4-a716-446655440000";
  const product1Id = "850e8400-e29b-41d4-a716-446655440001";
  const product2Id = "850e8400-e29b-41d4-a716-446655440002";

  // Fixed timestamp: Oct 31, 2025 10:00 AM UTC
  const fixedNow = new Date("2025-10-31T10:00:00.000Z");

  let publishDeps: PublishRoutineDeps;
  let routineDeps: RoutineDeps;
  let productDeps: UpdateRoutineProductDeps;

  beforeEach(async () => {
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;

    publishDeps = {
      routineRepo: makeRoutineRepo({ db }),
      productRepo: makeRoutineProductsRepo({ db }),
      userRepo: makeUserProfileRepo({ db }),
      db: db,
      now: () => fixedNow,
    };

    routineDeps = {
      repo: makeRoutineRepo({ db }),
      db: db,
      now: () => fixedNow,
    };

    productDeps = {
      repo: makeRoutineProductsRepo({ db }),
      routineRepo: makeRoutineRepo({ db }),
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

  it("handles publish → update start date → update product frequency", async () => {
    // GIVEN: Routine with daily product
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

    // WHEN: Publish (Oct 31 → Dec 29, 60 days)
    await publishRoutine(routineId, publishDeps);
    const tasksAfterPublish = await db
      .select()
      .from(schema.routineStepCompletions)
      .where(eq(schema.routineStepCompletions.routineProductId, product1Id));
    expect(tasksAfterPublish).toHaveLength(60);

    // THEN: Update start date forward (Nov 10)
    const updateResult = await updateRoutine(
      routineId,
      { startDate: new Date("2025-11-10") },
      routineDeps,
    );
    expect(updateResult.success).toBe(true);
    if (updateResult.success) {
      expect(updateResult.data.startDate).toEqual(new Date("2025-11-10"));
    }

    // Verify routine was actually updated in database
    const [updatedRoutine] = await db
      .select()
      .from(schema.skincareRoutines)
      .where(eq(schema.skincareRoutines.id, routineId));
    expect(updatedRoutine.startDate).toEqual(new Date("2025-11-10"));

    const tasksAfterStartUpdate = await db
      .select()
      .from(schema.routineStepCompletions)
      .where(eq(schema.routineStepCompletions.routineProductId, product1Id));
    expect(tasksAfterStartUpdate).toHaveLength(50); // Nov 10 → Dec 29

    // THEN: Update product frequency (daily → Mon/Wed/Fri)
    await updateRoutineProduct(
      product1Id,
      {
        frequency: "specific_days",
        days: ["Monday", "Wednesday", "Friday"],
      },
      productDeps,
    );
    const tasksAfterProductUpdate = await db
      .select()
      .from(schema.routineStepCompletions)
      .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

    // Product update correctly respects updated routine start date
    // Nov 10 → Dec 29 = 50 days, Mon/Wed/Fri ~= 21 days
    expect(tasksAfterProductUpdate.length).toBeLessThan(50);
    expect(tasksAfterProductUpdate.length).toBeGreaterThanOrEqual(20);
    expect(tasksAfterProductUpdate.length).toBeLessThanOrEqual(22);
  });

  it("handles multiple product updates in sequence", async () => {
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
        productName: "Cleanser",
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
        productName: "Moisturizer",
        instructions: "Apply to face",
        frequency: "daily",
        days: null,
        timeOfDay: "morning",
        order: 2,
      },
    ]);

    // WHEN: Publish
    await publishRoutine(routineId, publishDeps);

    // THEN: Update product1 frequency
    await updateRoutineProduct(
      product1Id,
      {
        frequency: "specific_days",
        days: ["Monday", "Wednesday", "Friday"],
      },
      productDeps,
    );

    // THEN: Update product2 time
    await updateRoutineProduct(
      product2Id,
      { timeOfDay: "evening" },
      productDeps,
    );

    // Verify final state
    const product1Tasks = await db
      .select()
      .from(schema.routineStepCompletions)
      .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

    const product2Tasks = await db
      .select()
      .from(schema.routineStepCompletions)
      .where(eq(schema.routineStepCompletions.routineProductId, product2Id));

    // Product1: Mon/Wed/Fri only
    expect(product1Tasks.length).toBeLessThan(60);

    // Product2: All 60 days but evening
    expect(product2Tasks).toHaveLength(60);
    expect(product2Tasks.every((t) => t.scheduledTimeOfDay === "evening")).toBe(
      true,
    );
  });

  it("preserves completed tasks through routine and product updates", async () => {
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
      productName: "Cleanser",
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

    // WHEN: Update start date forward
    await updateRoutine(
      routineId,
      { startDate: new Date("2025-11-10") },
      routineDeps,
    );

    // THEN: Completed task still exists
    let completedTask = await db
      .select()
      .from(schema.routineStepCompletions)
      .where(eq(schema.routineStepCompletions.id, firstTask.id));
    expect(completedTask).toHaveLength(1);
    expect(completedTask[0].status).toBe("on-time");

    // WHEN: Update product frequency
    await updateRoutineProduct(
      product1Id,
      {
        frequency: "specific_days",
        days: ["Monday", "Wednesday", "Friday"],
      },
      productDeps,
    );

    // THEN: Completed task STILL exists
    completedTask = await db
      .select()
      .from(schema.routineStepCompletions)
      .where(eq(schema.routineStepCompletions.id, firstTask.id));
    expect(completedTask).toHaveLength(1);
    expect(completedTask[0].status).toBe("on-time");
  });

  it("handles setting end date then updating product", async () => {
    // GIVEN: Indefinite routine
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

    await publishRoutine(routineId, publishDeps);

    // WHEN: Set end date to Nov 30
    await updateRoutine(
      routineId,
      { endDate: new Date("2025-11-30") },
      routineDeps,
    );

    const tasksAfterEndDate = await db
      .select()
      .from(schema.routineStepCompletions)
      .where(eq(schema.routineStepCompletions.routineProductId, product1Id));
    expect(tasksAfterEndDate).toHaveLength(31); // Oct 31 → Nov 30

    // THEN: Update product frequency
    await updateRoutineProduct(
      product1Id,
      {
        frequency: "specific_days",
        days: ["Monday", "Wednesday", "Friday"],
      },
      productDeps,
    );

    const tasksAfterProductUpdate = await db
      .select()
      .from(schema.routineStepCompletions)
      .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

    // Should respect Nov 30 end date
    const beyondEndDate = tasksAfterProductUpdate.filter(
      (t) => t.scheduledDate.getTime() > new Date("2025-11-30").getTime(),
    );
    expect(beyondEndDate).toHaveLength(0);
  });

  it("handles extending end date then updating product", async () => {
    // GIVEN: Routine with limited end date
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
      productName: "Cleanser",
      instructions: "Apply to face",
      frequency: "daily",
      days: null,
      timeOfDay: "morning",
      order: 1,
    });

    await publishRoutine(routineId, publishDeps);
    expect(
      await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id)),
    ).toHaveLength(16); // Oct 31 → Nov 15

    // WHEN: Extend end date to Nov 30
    await updateRoutine(
      routineId,
      { endDate: new Date("2025-11-30") },
      routineDeps,
    );
    expect(
      await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id)),
    ).toHaveLength(31); // Oct 31 → Nov 30

    // THEN: Update product frequency
    await updateRoutineProduct(
      product1Id,
      {
        frequency: "specific_days",
        days: ["Monday", "Wednesday", "Friday"],
      },
      productDeps,
    );

    const tasks = await db
      .select()
      .from(schema.routineStepCompletions)
      .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

    // Oct 31 → Nov 30 (31 days), Mon/Wed/Fri only
    expect(tasks.length).toBeLessThan(31);
    expect(tasks.length).toBeGreaterThanOrEqual(12);
    expect(tasks.length).toBeLessThanOrEqual(14);

    // All tasks within Nov 30
    const beyondEndDate = tasks.filter(
      (t) => t.scheduledDate.getTime() > new Date("2025-11-30").getTime(),
    );
    expect(beyondEndDate).toHaveLength(0);
  });

  it("handles publish → update product → update start date → update product again", async () => {
    // GIVEN: Routine with daily product
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

    // Step 1: Publish
    await publishRoutine(routineId, publishDeps);
    expect(
      await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id)),
    ).toHaveLength(60);

    // Step 2: Update product to Mon/Wed/Fri
    await updateRoutineProduct(
      product1Id,
      {
        frequency: "specific_days",
        days: ["Monday", "Wednesday", "Friday"],
      },
      productDeps,
    );
    const tasksAfterFirstProductUpdate = await db
      .select()
      .from(schema.routineStepCompletions)
      .where(eq(schema.routineStepCompletions.routineProductId, product1Id));
    expect(tasksAfterFirstProductUpdate.length).toBeLessThan(60);

    // Step 3: Update start date to Nov 10
    await updateRoutine(
      routineId,
      { startDate: new Date("2025-11-10") },
      routineDeps,
    );
    const tasksAfterStartUpdate = await db
      .select()
      .from(schema.routineStepCompletions)
      .where(eq(schema.routineStepCompletions.routineProductId, product1Id));
    expect(tasksAfterStartUpdate.length).toBeLessThan(
      tasksAfterFirstProductUpdate.length,
    );

    // Step 4: Update product back to daily
    await updateRoutineProduct(
      product1Id,
      { frequency: "daily", days: null },
      productDeps,
    );
    const tasksAfterSecondProductUpdate = await db
      .select()
      .from(schema.routineStepCompletions)
      .where(eq(schema.routineStepCompletions.routineProductId, product1Id));

    // Product update correctly respects updated routine start date
    // Nov 10 → Dec 29 = 50 days (all daily)
    expect(tasksAfterSecondProductUpdate).toHaveLength(50);

    // Earliest task is Nov 10 (respects updated start date)
    const sortedTasks = tasksAfterSecondProductUpdate.sort(
      (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime(),
    );
    expect(sortedTasks[0].scheduledDate).toEqual(new Date("2025-11-10"));
  });

  it("handles removing end date then updating multiple products", async () => {
    // GIVEN: Routine with end date and 2 products
    await db.insert(schema.skincareRoutines).values({
      id: routineId,
      userProfileId: user1Id,
      name: "Morning Routine",
      startDate: new Date("2025-10-31"),
      endDate: new Date("2025-11-15"),
      status: "draft",
    });

    await db.insert(schema.skincareRoutineProducts).values([
      {
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
      },
      {
        id: product2Id,
        routineId,
        userProfileId: user1Id,
        routineStep: "moisturize",
        productName: "Moisturizer",
        instructions: "Apply to face",
        frequency: "daily",
        days: null,
        timeOfDay: "evening",
        order: 2,
      },
    ]);

    await publishRoutine(routineId, publishDeps);

    // WHEN: Remove end date (set to null)
    await updateRoutine(routineId, { endDate: null }, routineDeps);

    // Both products should have 60 tasks now
    expect(
      await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product1Id)),
    ).toHaveLength(60);
    expect(
      await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.routineProductId, product2Id)),
    ).toHaveLength(60);

    // THEN: Update both products
    await updateRoutineProduct(
      product1Id,
      {
        frequency: "specific_days",
        days: ["Monday", "Wednesday", "Friday"],
      },
      productDeps,
    );
    await updateRoutineProduct(
      product2Id,
      {
        frequency: "specific_days",
        days: ["Tuesday", "Thursday", "Saturday"],
      },
      productDeps,
    );

    const product1Tasks = await db
      .select()
      .from(schema.routineStepCompletions)
      .where(eq(schema.routineStepCompletions.routineProductId, product1Id));
    const product2Tasks = await db
      .select()
      .from(schema.routineStepCompletions)
      .where(eq(schema.routineStepCompletions.routineProductId, product2Id));

    // Both should have ~26 tasks (Mon/Wed/Fri or Tue/Thu/Sat in 60 days)
    expect(product1Tasks.length).toBeGreaterThanOrEqual(25);
    expect(product1Tasks.length).toBeLessThanOrEqual(27);
    expect(product2Tasks.length).toBeGreaterThanOrEqual(25);
    expect(product2Tasks.length).toBeLessThanOrEqual(27);
  });
});
