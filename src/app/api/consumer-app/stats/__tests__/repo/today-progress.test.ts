// Repo tests for getTodayProgress
import { describe, it, expect, beforeEach } from "vitest";
import * as schema from "@/lib/db/schema";
import {
  setupRepoTests,
  db,
  repo,
  authUserId,
  authUserId2,
  profileId,
  profileId2,
  routineId,
  productId1,
  productId2,
  productId3,
  productId4,
  productId5,
} from "./test-setup";

describe("StatsRepo - getTodayProgress", () => {
  setupRepoTests();

  beforeEach(async () => {
    await db.insert(schema.userProfiles).values({
      id: profileId,
      userId: authUserId,
      email: "user@test.com",
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "+1234567890",
      dateOfBirth: new Date("1990-01-01"),
      timezone: "Europe/London",
    });

    await db.insert(schema.skincareRoutines).values({
      id: routineId,
      userProfileId: profileId,
      name: "Daily Routine",
      startDate: new Date("2025-11-01"),
      status: "published",
    });
  });

  it("returns zero counts when user has no steps today", async () => {
    const today = "2025-11-01";

    const result = await repo.getTodayProgress(profileId, today);

    expect(result.total).toBe(0);
    expect(result.completed).toBe(0);
  });

  it("returns correct counts when user has 5 scheduled and 3 completed", async () => {
    const today = "2025-11-01";

    await db.insert(schema.skincareRoutineProducts).values([
      {
        id: productId1,
        routineId,
        userProfileId: profileId,
        routineStep: "Cleanse",
        productName: "Cleanser",
        instructions: "Apply to face",
        frequency: "daily",
        timeOfDay: "morning",
        order: 1,
      },
      {
        id: productId2,
        routineId,
        userProfileId: profileId,
        routineStep: "Tone",
        productName: "Toner",
        instructions: "Apply with cotton pad",
        frequency: "daily",
        timeOfDay: "morning",
        order: 2,
      },
      {
        id: productId3,
        routineId,
        userProfileId: profileId,
        routineStep: "Moisturize",
        productName: "Moisturizer",
        instructions: "Apply evenly",
        frequency: "daily",
        timeOfDay: "morning",
        order: 3,
      },
      {
        id: productId4,
        routineId,
        userProfileId: profileId,
        routineStep: "Serum",
        productName: "Serum",
        instructions: "Apply drops",
        frequency: "daily",
        timeOfDay: "morning",
        order: 4,
      },
      {
        id: productId5,
        routineId,
        userProfileId: profileId,
        routineStep: "SPF",
        productName: "Sunscreen",
        instructions: "Apply liberally",
        frequency: "daily",
        timeOfDay: "morning",
        order: 5,
      },
    ]);

    await db.insert(schema.routineStepCompletions).values([
      {
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date(today),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-01T08:00:00Z"),
      },
      {
        routineProductId: productId2,
        userProfileId: profileId,
        scheduledDate: new Date(today),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-01T08:05:00Z"),
      },
      {
        routineProductId: productId3,
        userProfileId: profileId,
        scheduledDate: new Date(today),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-01T08:10:00Z"),
      },
      {
        routineProductId: productId4,
        userProfileId: profileId,
        scheduledDate: new Date(today),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
        status: "pending",
        completedAt: null,
      },
      {
        routineProductId: productId5,
        userProfileId: profileId,
        scheduledDate: new Date(today),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
        status: "pending",
        completedAt: null,
      },
    ]);

    const result = await repo.getTodayProgress(profileId, today);

    expect(result.total).toBe(5);
    expect(result.completed).toBe(3);
  });

  it("counts on-time status as completed", async () => {
    const today = "2025-11-01";

    await db.insert(schema.skincareRoutineProducts).values({
      id: productId1,
      routineId,
      userProfileId: profileId,
      routineStep: "Cleanse",
      productName: "Cleanser",
      instructions: "Apply",
      frequency: "daily",
      timeOfDay: "morning",
      order: 1,
    });

    await db.insert(schema.routineStepCompletions).values({
      routineProductId: productId1,
      userProfileId: profileId,
      scheduledDate: new Date(today),
      scheduledTimeOfDay: "morning",
      onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
      gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
      status: "on-time",
      completedAt: new Date("2025-11-01T08:00:00Z"),
    });

    const result = await repo.getTodayProgress(profileId, today);

    expect(result.total).toBe(1);
    expect(result.completed).toBe(1);
  });

  it("counts late status as completed", async () => {
    const today = "2025-11-01";

    await db.insert(schema.skincareRoutineProducts).values({
      id: productId1,
      routineId,
      userProfileId: profileId,
      routineStep: "Cleanse",
      productName: "Cleanser",
      instructions: "Apply",
      frequency: "daily",
      timeOfDay: "morning",
      order: 1,
    });

    await db.insert(schema.routineStepCompletions).values({
      routineProductId: productId1,
      userProfileId: profileId,
      scheduledDate: new Date(today),
      scheduledTimeOfDay: "morning",
      onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
      gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
      status: "late",
      completedAt: new Date("2025-11-01T15:00:00Z"),
    });

    const result = await repo.getTodayProgress(profileId, today);

    expect(result.total).toBe(1);
    expect(result.completed).toBe(1);
  });

  it("does NOT count pending status as completed", async () => {
    const today = "2025-11-01";

    await db.insert(schema.skincareRoutineProducts).values({
      id: productId1,
      routineId,
      userProfileId: profileId,
      routineStep: "Cleanse",
      productName: "Cleanser",
      instructions: "Apply",
      frequency: "daily",
      timeOfDay: "morning",
      order: 1,
    });

    await db.insert(schema.routineStepCompletions).values({
      routineProductId: productId1,
      userProfileId: profileId,
      scheduledDate: new Date(today),
      scheduledTimeOfDay: "morning",
      onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
      gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
      status: "pending",
      completedAt: null,
    });

    const result = await repo.getTodayProgress(profileId, today);

    expect(result.total).toBe(1);
    expect(result.completed).toBe(0);
  });

  it("does NOT count missed status as completed", async () => {
    const today = "2025-11-01";

    await db.insert(schema.skincareRoutineProducts).values({
      id: productId1,
      routineId,
      userProfileId: profileId,
      routineStep: "Cleanse",
      productName: "Cleanser",
      instructions: "Apply",
      frequency: "daily",
      timeOfDay: "morning",
      order: 1,
    });

    await db.insert(schema.routineStepCompletions).values({
      routineProductId: productId1,
      userProfileId: profileId,
      scheduledDate: new Date(today),
      scheduledTimeOfDay: "morning",
      onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
      gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
      status: "missed",
      completedAt: null,
    });

    const result = await repo.getTodayProgress(profileId, today);

    expect(result.total).toBe(1);
    expect(result.completed).toBe(0);
  });

  it("filters by correct userProfileId and does not count other users", async () => {
    const today = "2025-11-01";

    await db.insert(schema.userProfiles).values({
      id: profileId2,
      userId: authUserId2,
      email: "user2@test.com",
      firstName: "Jane",
      lastName: "Smith",
      phoneNumber: "+9999999999",
      dateOfBirth: new Date("1991-01-01"),
    });

    const routine2Id = "650e8400-e29b-41d4-a716-446655440001";
    await db.insert(schema.skincareRoutines).values({
      id: routine2Id,
      userProfileId: profileId2,
      name: "User 2 Routine",
      startDate: new Date("2025-11-01"),
      status: "published",
    });

    await db.insert(schema.skincareRoutineProducts).values({
      id: productId1,
      routineId,
      userProfileId: profileId,
      routineStep: "Cleanse",
      productName: "Cleanser",
      instructions: "Apply",
      frequency: "daily",
      timeOfDay: "morning",
      order: 1,
    });

    const product2User2 = "750e8400-e29b-41d4-a716-446655440999";
    await db.insert(schema.skincareRoutineProducts).values({
      id: product2User2,
      routineId: routine2Id,
      userProfileId: profileId2,
      routineStep: "Cleanse",
      productName: "Cleanser",
      instructions: "Apply",
      frequency: "daily",
      timeOfDay: "morning",
      order: 1,
    });

    await db.insert(schema.routineStepCompletions).values([
      {
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date(today),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-01T08:00:00Z"),
      },
      {
        routineProductId: product2User2,
        userProfileId: profileId2,
        scheduledDate: new Date(today),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-01T08:00:00Z"),
      },
    ]);

    const result = await repo.getTodayProgress(profileId, today);

    expect(result.total).toBe(1);
    expect(result.completed).toBe(1);
  });
});
