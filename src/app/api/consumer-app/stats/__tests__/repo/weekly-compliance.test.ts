// Repo tests for getWeeklyCompliance
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

describe("StatsRepo - getWeeklyCompliance", () => {
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
      startDate: new Date("2025-10-20"),
      status: "published",
    });

    await db.insert(schema.skincareRoutineProducts).values([
      {
        id: productId1,
        routineId,
        userProfileId: profileId,
        routineStep: "Cleanse",
        productName: "Cleanser",
        instructions: "Apply",
        frequency: "daily",
        timeOfDay: "morning",
        order: 1,
      },
      {
        id: productId2,
        routineId,
        userProfileId: profileId,
        routineStep: "Moisturize",
        productName: "Moisturizer",
        instructions: "Apply",
        frequency: "daily",
        timeOfDay: "morning",
        order: 2,
      },
      {
        id: productId3,
        routineId,
        userProfileId: profileId,
        routineStep: "Serum",
        productName: "Serum",
        instructions: "Apply",
        frequency: "daily",
        timeOfDay: "evening",
        order: 1,
      },
      {
        id: productId4,
        routineId,
        userProfileId: profileId,
        routineStep: "Night Cream",
        productName: "Night Cream",
        instructions: "Apply",
        frequency: "daily",
        timeOfDay: "evening",
        order: 2,
      },
      {
        id: productId5,
        routineId,
        userProfileId: profileId,
        routineStep: "SPF",
        productName: "Sunscreen",
        instructions: "Apply",
        frequency: "daily",
        timeOfDay: "morning",
        order: 3,
      },
    ]);
  });

  it("returns zero when user has no completions in last 7 days", async () => {
    const weekStart = "2025-11-01";
    const weekEnd = "2025-11-07";

    const result = await repo.getWeeklyCompliance(
      profileId,
      weekStart,
      weekEnd,
    );

    expect(result.total).toBe(0);
    expect(result.completed).toBe(0);
  });

  it("returns correct counts for last 7 days with 5 products per day", async () => {
    const weekStart = "2025-11-01";
    const weekEnd = "2025-11-07";

    // Days Nov 1-6: All 5 products completed (30 completions)
    const perfectDays = [
      "2025-11-01",
      "2025-11-02",
      "2025-11-03",
      "2025-11-04",
      "2025-11-05",
      "2025-11-06",
    ];

    for (const date of perfectDays) {
      await db.insert(schema.routineStepCompletions).values([
        {
          routineProductId: productId1,
          userProfileId: profileId,
          scheduledDate: new Date(date),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date(`${date}T12:00:00Z`),
          gracePeriodEnd: new Date(`${date}T12:00:00Z`),
          status: "on-time",
          completedAt: new Date(`${date}T08:00:00Z`),
        },
        {
          routineProductId: productId2,
          userProfileId: profileId,
          scheduledDate: new Date(date),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date(`${date}T12:00:00Z`),
          gracePeriodEnd: new Date(`${date}T12:00:00Z`),
          status: "on-time",
          completedAt: new Date(`${date}T08:05:00Z`),
        },
        {
          routineProductId: productId3,
          userProfileId: profileId,
          scheduledDate: new Date(date),
          scheduledTimeOfDay: "evening",
          onTimeDeadline: new Date(`${date}T23:59:59Z`),
          gracePeriodEnd: new Date(`${date}T23:59:59Z`),
          status: "on-time",
          completedAt: new Date(`${date}T20:00:00Z`),
        },
        {
          routineProductId: productId4,
          userProfileId: profileId,
          scheduledDate: new Date(date),
          scheduledTimeOfDay: "evening",
          onTimeDeadline: new Date(`${date}T23:59:59Z`),
          gracePeriodEnd: new Date(`${date}T23:59:59Z`),
          status: "on-time",
          completedAt: new Date(`${date}T20:05:00Z`),
        },
        {
          routineProductId: productId5,
          userProfileId: profileId,
          scheduledDate: new Date(date),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date(`${date}T12:00:00Z`),
          gracePeriodEnd: new Date(`${date}T12:00:00Z`),
          status: "on-time",
          completedAt: new Date(`${date}T08:10:00Z`),
        },
      ]);
    }

    // Day Nov 7: Only 3 of 5 completed
    await db.insert(schema.routineStepCompletions).values([
      {
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-07T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-08T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-07T08:00:00Z"),
      },
      {
        routineProductId: productId2,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-07T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-08T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-07T08:05:00Z"),
      },
      {
        routineProductId: productId3,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "evening",
        onTimeDeadline: new Date("2025-11-07T23:59:59Z"),
        gracePeriodEnd: new Date("2025-11-08T23:59:59Z"),
        status: "on-time",
        completedAt: new Date("2025-11-07T20:00:00Z"),
      },
      {
        routineProductId: productId4,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "evening",
        onTimeDeadline: new Date("2025-11-07T23:59:59Z"),
        gracePeriodEnd: new Date("2025-11-08T23:59:59Z"),
        status: "pending",
        completedAt: null,
      },
      {
        routineProductId: productId5,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-07T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-08T12:00:00Z"),
        status: "pending",
        completedAt: null,
      },
    ]);

    const result = await repo.getWeeklyCompliance(
      profileId,
      weekStart,
      weekEnd,
    );

    expect(result.total).toBe(35);
    expect(result.completed).toBe(33);
  });

  it("counts both on-time and late as completed", async () => {
    const weekStart = "2025-11-01";
    const weekEnd = "2025-11-01";

    await db.insert(schema.routineStepCompletions).values([
      {
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-01"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-01T08:00:00Z"),
      },
      {
        routineProductId: productId2,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-01"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
        status: "late",
        completedAt: new Date("2025-11-01T15:00:00Z"),
      },
      {
        routineProductId: productId3,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-01"),
        scheduledTimeOfDay: "evening",
        onTimeDeadline: new Date("2025-11-01T23:59:59Z"),
        gracePeriodEnd: new Date("2025-11-02T23:59:59Z"),
        status: "late",
        completedAt: new Date("2025-11-02T02:00:00Z"),
      },
      {
        routineProductId: productId4,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-01"),
        scheduledTimeOfDay: "evening",
        onTimeDeadline: new Date("2025-11-01T23:59:59Z"),
        gracePeriodEnd: new Date("2025-11-02T23:59:59Z"),
        status: "pending",
        completedAt: null,
      },
      {
        routineProductId: productId5,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-01"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-01T08:10:00Z"),
      },
    ]);

    const result = await repo.getWeeklyCompliance(
      profileId,
      weekStart,
      weekEnd,
    );

    expect(result.total).toBe(5);
    expect(result.completed).toBe(4);
  });

  it("does NOT count pending or missed as completed", async () => {
    const weekStart = "2025-11-01";
    const weekEnd = "2025-11-01";

    await db.insert(schema.routineStepCompletions).values([
      {
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-01"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-01T08:00:00Z"),
      },
      {
        routineProductId: productId2,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-01"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
        status: "late",
        completedAt: new Date("2025-11-01T15:00:00Z"),
      },
      {
        routineProductId: productId3,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-01"),
        scheduledTimeOfDay: "evening",
        onTimeDeadline: new Date("2025-11-01T23:59:59Z"),
        gracePeriodEnd: new Date("2025-11-02T23:59:59Z"),
        status: "pending",
        completedAt: null,
      },
      {
        routineProductId: productId4,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-01"),
        scheduledTimeOfDay: "evening",
        onTimeDeadline: new Date("2025-11-01T23:59:59Z"),
        gracePeriodEnd: new Date("2025-11-02T23:59:59Z"),
        status: "missed",
        completedAt: null,
      },
      {
        routineProductId: productId5,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-01"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
        status: "pending",
        completedAt: null,
      },
    ]);

    const result = await repo.getWeeklyCompliance(
      profileId,
      weekStart,
      weekEnd,
    );

    expect(result.total).toBe(5);
    expect(result.completed).toBe(2);
  });

  it("only includes dates within range and excludes day 8", async () => {
    const weekStart = "2025-11-01";
    const weekEnd = "2025-11-07";

    // Oct 31 - 8 days before Nov 7 (SHOULD BE EXCLUDED)
    await db.insert(schema.routineStepCompletions).values([
      {
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-10-31"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-10-31T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-01T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-10-31T08:00:00Z"),
      },
      {
        routineProductId: productId2,
        userProfileId: profileId,
        scheduledDate: new Date("2025-10-31"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-10-31T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-01T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-10-31T08:05:00Z"),
      },
    ]);

    // Nov 1-7: All included
    const includedDates = [
      "2025-11-01",
      "2025-11-02",
      "2025-11-03",
      "2025-11-04",
      "2025-11-05",
      "2025-11-06",
      "2025-11-07",
    ];

    for (const date of includedDates) {
      await db.insert(schema.routineStepCompletions).values([
        {
          routineProductId: productId1,
          userProfileId: profileId,
          scheduledDate: new Date(date),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date(`${date}T12:00:00Z`),
          gracePeriodEnd: new Date(`${date}T12:00:00Z`),
          status: "on-time",
          completedAt: new Date(`${date}T08:00:00Z`),
        },
        {
          routineProductId: productId2,
          userProfileId: profileId,
          scheduledDate: new Date(date),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date(`${date}T12:00:00Z`),
          gracePeriodEnd: new Date(`${date}T12:00:00Z`),
          status: "on-time",
          completedAt: new Date(`${date}T08:05:00Z`),
        },
      ]);
    }

    const result = await repo.getWeeklyCompliance(
      profileId,
      weekStart,
      weekEnd,
    );

    expect(result.total).toBe(14);
    expect(result.completed).toBe(14);
  });

  it("includes today in the calculation", async () => {
    const today = "2025-11-07";
    const weekStart = "2025-11-01";
    const weekEnd = today;

    await db.insert(schema.routineStepCompletions).values([
      {
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-07T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-08T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-07T08:00:00Z"),
      },
      {
        routineProductId: productId2,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-07T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-08T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-07T08:05:00Z"),
      },
    ]);

    const result = await repo.getWeeklyCompliance(
      profileId,
      weekStart,
      weekEnd,
    );

    expect(result.total).toBe(2);
    expect(result.completed).toBe(2);
  });

  it("filters by correct userProfileId", async () => {
    const weekStart = "2025-11-01";
    const weekEnd = "2025-11-01";

    await db.insert(schema.userProfiles).values({
      id: profileId2,
      userId: authUserId2,
      email: "user2@test.com",
      firstName: "Jane",
      lastName: "Smith",
      phoneNumber: "+9999999999",
      dateOfBirth: new Date("1991-01-01"),
    });

    const routine2Id = "650e8400-e29b-41d4-a716-446655440099";
    await db.insert(schema.skincareRoutines).values({
      id: routine2Id,
      userProfileId: profileId2,
      name: "User 2 Routine",
      startDate: new Date("2025-10-20"),
      status: "published",
    });

    const user2ProductId = "750e8400-e29b-41d4-a716-446655449999";
    await db.insert(schema.skincareRoutineProducts).values({
      id: user2ProductId,
      routineId: routine2Id,
      userProfileId: profileId2,
      routineStep: "Cleanse",
      productName: "User 2 Cleanser",
      instructions: "Apply",
      frequency: "daily",
      timeOfDay: "morning",
      order: 1,
    });

    await db.insert(schema.routineStepCompletions).values([
      {
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-01"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-01T08:00:00Z"),
      },
      {
        routineProductId: productId2,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-01"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-01T08:05:00Z"),
      },
    ]);

    await db.insert(schema.routineStepCompletions).values([
      {
        routineProductId: user2ProductId,
        userProfileId: profileId2,
        scheduledDate: new Date("2025-11-01"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-01T08:00:00Z"),
      },
    ]);

    const result = await repo.getWeeklyCompliance(
      profileId,
      weekStart,
      weekEnd,
    );

    expect(result.total).toBe(2);
    expect(result.completed).toBe(2);
  });
});
