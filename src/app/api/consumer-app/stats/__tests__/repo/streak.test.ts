// Repo tests for getCurrentStreak
import { describe, it, expect, beforeEach } from "vitest";
import * as schema from "@/lib/db/schema";
import {
  setupRepoTests,
  db,
  repo,
  authUserId,
  profileId,
  routineId,
  productId1,
  productId2,
} from "./test-setup";

describe("StatsRepo - getCurrentStreak", () => {
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
      startDate: new Date("2025-10-01"),
      status: "published",
    });

    await db.insert(schema.skincareRoutineProducts).values([
      {
        id: productId1,
        routineId,
        userProfileId: profileId,
        routineStep: "Cleanse",
        productName: "Cleanse",
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
        productName: "Moisturise",
        instructions: "Apply",
        frequency: "daily",
        timeOfDay: "morning",
        order: 2,
      },
    ]);
  });

  it("returns 0 when no completions exist", async () => {
    const today = "2025-11-01";

    const streak = await repo.getCurrentStreak(profileId, today);

    expect(streak).toBe(0);
  });

  it("returns 1 when only today is perfect", async () => {
    const today = "2025-11-01";

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
    ]);

    const streak = await repo.getCurrentStreak(profileId, today);

    expect(streak).toBe(1);
  });

  it("returns 7 when last 7 consecutive days are perfect", async () => {
    const today = "2025-11-07";
    const dates = [
      "2025-11-07",
      "2025-11-06",
      "2025-11-05",
      "2025-11-04",
      "2025-11-03",
      "2025-11-02",
      "2025-11-01",
    ];

    for (const date of dates) {
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

    const streak = await repo.getCurrentStreak(profileId, today);

    expect(streak).toBe(7);
  });

  it("stops counting at first incomplete day", async () => {
    const today = "2025-11-07";

    // Nov 7 - perfect
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

    // Nov 6 - perfect
    await db.insert(schema.routineStepCompletions).values([
      {
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-06"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-06T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-07T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-06T08:00:00Z"),
      },
      {
        routineProductId: productId2,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-06"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-06T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-07T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-06T08:05:00Z"),
      },
    ]);

    // Nov 5 - perfect
    await db.insert(schema.routineStepCompletions).values([
      {
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-05"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-05T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-06T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-05T08:00:00Z"),
      },
      {
        routineProductId: productId2,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-05"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-05T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-06T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-05T08:05:00Z"),
      },
    ]);

    // Nov 4 - INCOMPLETE (only 1 of 2 completed)
    await db.insert(schema.routineStepCompletions).values([
      {
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-04"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-04T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-05T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-04T08:00:00Z"),
      },
      {
        routineProductId: productId2,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-04"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-04T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-05T12:00:00Z"),
        status: "pending",
        completedAt: null,
      },
    ]);

    // Nov 3-1 - all perfect (should NOT be counted)
    const olderPerfectDates = ["2025-11-03", "2025-11-02", "2025-11-01"];
    for (const date of olderPerfectDates) {
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

    const streak = await repo.getCurrentStreak(profileId, today);

    expect(streak).toBe(3);
  });

  it("does NOT include future dates in streak calculation", async () => {
    const today = "2025-11-01";

    // Today - perfect
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

    // Tomorrow - pending (future, should be excluded by query)
    await db.insert(schema.routineStepCompletions).values([
      {
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-02"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-02T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-03T12:00:00Z"),
        status: "pending",
        completedAt: null,
      },
      {
        routineProductId: productId2,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-02"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-02T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-03T12:00:00Z"),
        status: "pending",
        completedAt: null,
      },
    ]);

    const streak = await repo.getCurrentStreak(profileId, today);

    expect(streak).toBe(1);
  });

  it("counts late completions as perfect days", async () => {
    const today = "2025-11-03";

    // Nov 3 - both on-time
    await db.insert(schema.routineStepCompletions).values([
      {
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-03"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-03T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-04T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-03T08:00:00Z"),
      },
      {
        routineProductId: productId2,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-03"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-03T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-04T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-03T08:05:00Z"),
      },
    ]);

    // Nov 2 - one on-time, one late (still perfect day)
    await db.insert(schema.routineStepCompletions).values([
      {
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-02"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-02T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-03T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-02T08:00:00Z"),
      },
      {
        routineProductId: productId2,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-02"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-02T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-03T12:00:00Z"),
        status: "late",
        completedAt: new Date("2025-11-02T15:00:00Z"),
      },
    ]);

    // Nov 1 - both late (still perfect day)
    await db.insert(schema.routineStepCompletions).values([
      {
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-01"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
        status: "late",
        completedAt: new Date("2025-11-01T14:00:00Z"),
      },
      {
        routineProductId: productId2,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-01"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-01T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-02T12:00:00Z"),
        status: "late",
        completedAt: new Date("2025-11-01T14:05:00Z"),
      },
    ]);

    const streak = await repo.getCurrentStreak(profileId, today);

    expect(streak).toBe(3);
  });

  it("returns 0 when today is incomplete even if yesterday was perfect", async () => {
    const today = "2025-11-02";

    // Nov 2 (today) - incomplete (1/2)
    await db.insert(schema.routineStepCompletions).values([
      {
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-02"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-02T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-03T12:00:00Z"),
        status: "on-time",
        completedAt: new Date("2025-11-02T08:00:00Z"),
      },
      {
        routineProductId: productId2,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-02"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-02T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-03T12:00:00Z"),
        status: "pending",
        completedAt: null,
      },
    ]);

    // Nov 1 (yesterday) - perfect
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

    const streak = await repo.getCurrentStreak(profileId, today);

    expect(streak).toBe(0);
  });

  it("can return streaks longer than 7 days", async () => {
    const today = "2025-11-30";
    const startDate = new Date("2025-11-01");
    const endDate = new Date("2025-11-30");

    // Generate 30 days of perfect completions
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];

      await db.insert(schema.routineStepCompletions).values([
        {
          routineProductId: productId1,
          userProfileId: profileId,
          scheduledDate: new Date(dateStr),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date(`${dateStr}T12:00:00Z`),
          gracePeriodEnd: new Date(`${dateStr}T12:00:00Z`),
          status: "on-time",
          completedAt: new Date(`${dateStr}T08:00:00Z`),
        },
        {
          routineProductId: productId2,
          userProfileId: profileId,
          scheduledDate: new Date(dateStr),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date(`${dateStr}T12:00:00Z`),
          gracePeriodEnd: new Date(`${dateStr}T12:00:00Z`),
          status: "on-time",
          completedAt: new Date(`${dateStr}T08:05:00Z`),
        },
      ]);

      currentDate.setDate(currentDate.getDate() + 1);
    }

    const streak = await repo.getCurrentStreak(profileId, today);

    expect(streak).toBe(30);
  });
});
