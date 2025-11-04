// Repository integration tests for getCatchupSteps
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  createTestDatabase,
  cleanupTestDatabase,
  type TestDatabase,
} from "@/test/db-helper";
import * as schema from "@/lib/db/schema";
import { makeDashboardRepo } from "../../dashboard.repo";

describe("DashboardRepo - getCatchupSteps", () => {
  let client: PGlite;
  let db: TestDatabase;
  let repo: ReturnType<typeof makeDashboardRepo>;

  // Test UUIDs
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const user2Id = "550e8400-e29b-41d4-a716-446655440001";
  const profileId = "4f3b0853-710e-4fe4-8960-c924eb2cdea4";
  const profile2Id = "4f3b0853-710e-4fe4-8960-c924eb2cdea5";
  const routineId = "750e8400-e29b-41d4-a716-446655440001";
  const routine2Id = "750e8400-e29b-41d4-a716-446655440002";
  const productId1 = "850e8400-e29b-41d4-a716-446655440001";
  const productId2 = "850e8400-e29b-41d4-a716-446655440002";
  const productId3 = "850e8400-e29b-41d4-a716-446655440003";

  beforeEach(async () => {
    // Create in-memory PGlite database with migrations
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;
    repo = makeDashboardRepo({ db });

    // Seed base test data
    await db.insert(schema.users).values({
      id: userId,
      email: "test@example.com",
    });

    await db.insert(schema.userProfiles).values({
      id: profileId,
      userId: userId,
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      phoneNumber: "+1234567890",
      dateOfBirth: new Date("1990-01-01"),
      timezone: "Europe/London",
    });

    await db.insert(schema.skincareRoutines).values({
      id: routineId,
      userProfileId: profileId,
      name: "Test Routine",
      startDate: new Date("2025-11-01"),
      status: "published",
    });

    await db.insert(schema.skincareRoutineProducts).values([
      {
        id: productId1,
        routineId,
        userProfileId: profileId,
        routineStep: "Cleanser",
        productName: "Morning Cleanser",
        instructions: "Apply",
        frequency: "daily",
        timeOfDay: "morning",
        order: 1,
      },
      {
        id: productId2,
        routineId,
        userProfileId: profileId,
        routineStep: "Moisturizer",
        productName: "Evening Moisturizer",
        instructions: "Apply",
        frequency: "daily",
        timeOfDay: "evening",
        order: 1,
      },
    ]);
  });

  afterEach(async () => {
    await cleanupTestDatabase(client);
  });

  it("returns empty array when no steps are within grace period", async () => {
    // Create steps from 3 days ago that are past grace period
    // Morning step: deadline 12pm, grace period ends 24 hours later (yesterday 12pm)
    const threeDaysAgo = new Date("2025-11-01T00:00:00Z");
    const deadline = new Date("2025-11-01T12:00:00Z");
    const gracePeriodEnd = new Date("2025-11-02T12:00:00Z"); // Yesterday noon - already passed

    await db.insert(schema.routineStepCompletions).values({
      routineProductId: productId1,
      userProfileId: profileId,
      scheduledDate: threeDaysAgo,
      scheduledTimeOfDay: "morning",
      onTimeDeadline: deadline,
      gracePeriodEnd: gracePeriodEnd,
      status: "pending",
    });

    const today = new Date("2025-11-04T10:00:00Z"); // Nov 4, 10am
    const result = await repo.getCatchupSteps(userId, today);

    expect(result).toEqual([]);
  });

  it("returns yesterday's pending steps within grace period", async () => {
    // Yesterday's morning step with grace period ending tomorrow
    const yesterday = new Date("2025-11-03T00:00:00Z");
    const deadline = new Date("2025-11-03T12:00:00Z"); // Yesterday noon
    const gracePeriodEnd = new Date("2025-11-04T12:00:00Z"); // Today noon

    await db.insert(schema.routineStepCompletions).values({
      routineProductId: productId1,
      userProfileId: profileId,
      scheduledDate: yesterday,
      scheduledTimeOfDay: "morning",
      onTimeDeadline: deadline,
      gracePeriodEnd: gracePeriodEnd,
      status: "pending",
    });

    const today = new Date("2025-11-04T10:00:00Z"); // Nov 4, 10am (before grace period ends)
    const result = await repo.getCatchupSteps(userId, today);

    expect(result).toHaveLength(1);
    expect(result[0].productName).toBe("Morning Cleanser");
    expect(result[0].status).toBe("pending");
  });

  it("does NOT return yesterday's completed steps (on-time or late)", async () => {
    const yesterday = new Date("2025-11-03T00:00:00Z");
    const deadline = new Date("2025-11-03T12:00:00Z");
    const gracePeriodEnd = new Date("2025-11-04T12:00:00Z");

    await db.insert(schema.routineStepCompletions).values([
      {
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: yesterday,
        scheduledTimeOfDay: "morning",
        onTimeDeadline: deadline,
        gracePeriodEnd: gracePeriodEnd,
        status: "on-time",
        completedAt: new Date("2025-11-03T08:00:00Z"),
      },
      {
        routineProductId: productId2,
        userProfileId: profileId,
        scheduledDate: yesterday,
        scheduledTimeOfDay: "evening",
        onTimeDeadline: new Date("2025-11-03T23:59:59Z"),
        gracePeriodEnd: new Date("2025-11-04T23:59:59Z"),
        status: "late",
        completedAt: new Date("2025-11-04T01:00:00Z"),
      },
    ]);

    const today = new Date("2025-11-04T10:00:00Z");
    const result = await repo.getCatchupSteps(userId, today);

    expect(result).toEqual([]);
  });

  it("does NOT return yesterday's missed steps", async () => {
    const yesterday = new Date("2025-11-03T00:00:00Z");
    const deadline = new Date("2025-11-03T12:00:00Z");
    const gracePeriodEnd = new Date("2025-11-04T12:00:00Z");

    await db.insert(schema.routineStepCompletions).values({
      routineProductId: productId1,
      userProfileId: profileId,
      scheduledDate: yesterday,
      scheduledTimeOfDay: "morning",
      onTimeDeadline: deadline,
      gracePeriodEnd: gracePeriodEnd,
      status: "missed",
    });

    const today = new Date("2025-11-04T10:00:00Z");
    const result = await repo.getCatchupSteps(userId, today);

    expect(result).toEqual([]);
  });

  it("does NOT return steps past grace period", async () => {
    // Yesterday's morning step with grace period that ended 2 hours ago
    const yesterday = new Date("2025-11-03T00:00:00Z");
    const deadline = new Date("2025-11-03T12:00:00Z");
    const gracePeriodEnd = new Date("2025-11-04T12:00:00Z"); // Noon today

    await db.insert(schema.routineStepCompletions).values({
      routineProductId: productId1,
      userProfileId: profileId,
      scheduledDate: yesterday,
      scheduledTimeOfDay: "morning",
      onTimeDeadline: deadline,
      gracePeriodEnd: gracePeriodEnd,
      status: "pending",
    });

    const today = new Date("2025-11-04T14:00:00Z"); // 2pm - past grace period
    const result = await repo.getCatchupSteps(userId, today);

    expect(result).toEqual([]);
  });

  it("returns steps from multiple previous days if within grace period", async () => {
    // Day before yesterday's evening step (grace ends today at 11:59pm)
    const dayBeforeYesterday = new Date("2025-11-02T00:00:00Z");
    await db.insert(schema.routineStepCompletions).values({
      routineProductId: productId2,
      userProfileId: profileId,
      scheduledDate: dayBeforeYesterday,
      scheduledTimeOfDay: "evening",
      onTimeDeadline: new Date("2025-11-02T23:59:59Z"),
      gracePeriodEnd: new Date("2025-11-04T23:59:59Z"), // Today 11:59pm (still within grace)
      status: "pending",
    });

    // Yesterday's evening step (grace ends tomorrow 11:59pm)
    const yesterday = new Date("2025-11-03T00:00:00Z");
    await db.insert(schema.routineStepCompletions).values({
      routineProductId: productId2,
      userProfileId: profileId,
      scheduledDate: yesterday,
      scheduledTimeOfDay: "evening",
      onTimeDeadline: new Date("2025-11-03T23:59:59Z"),
      gracePeriodEnd: new Date("2025-11-05T23:59:59Z"), // Tomorrow 11:59pm
      status: "pending",
    });

    const today = new Date("2025-11-04T10:00:00Z"); // Nov 4, 10am
    const result = await repo.getCatchupSteps(userId, today);

    expect(result).toHaveLength(2);
    // Should be ordered by scheduledDate DESC (most recent first)
    expect(result[0].scheduledDate).toEqual(yesterday);
    expect(result[1].scheduledDate).toEqual(dayBeforeYesterday);
  });

  it("filters by correct userProfileId", async () => {
    // Create second user
    await db.insert(schema.users).values({
      id: user2Id,
      email: "user2@example.com",
    });

    await db.insert(schema.userProfiles).values({
      id: profile2Id,
      userId: user2Id,
      email: "user2@example.com",
      firstName: "User",
      lastName: "Two",
      phoneNumber: "+9876543210",
      dateOfBirth: new Date("1991-01-01"),
      timezone: "Europe/London",
    });

    await db.insert(schema.skincareRoutines).values({
      id: routine2Id,
      userProfileId: profile2Id,
      name: "User 2 Routine",
      startDate: new Date("2025-11-01"),
      status: "published",
    });

    await db.insert(schema.skincareRoutineProducts).values({
      id: productId3,
      routineId: routine2Id,
      userProfileId: profile2Id,
      routineStep: "Cleanser",
      productName: "User 2 Cleanser",
      instructions: "Apply",
      frequency: "daily",
      timeOfDay: "morning",
      order: 1,
    });

    // User 1's catchup step
    const yesterday = new Date("2025-11-03T00:00:00Z");
    await db.insert(schema.routineStepCompletions).values({
      routineProductId: productId1,
      userProfileId: profileId,
      scheduledDate: yesterday,
      scheduledTimeOfDay: "morning",
      onTimeDeadline: new Date("2025-11-03T12:00:00Z"),
      gracePeriodEnd: new Date("2025-11-04T12:00:00Z"),
      status: "pending",
    });

    // User 2's catchup step
    await db.insert(schema.routineStepCompletions).values({
      routineProductId: productId3,
      userProfileId: profile2Id,
      scheduledDate: yesterday,
      scheduledTimeOfDay: "morning",
      onTimeDeadline: new Date("2025-11-03T12:00:00Z"),
      gracePeriodEnd: new Date("2025-11-04T12:00:00Z"),
      status: "pending",
    });

    const today = new Date("2025-11-04T10:00:00Z");
    const result = await repo.getCatchupSteps(userId, today);

    expect(result).toHaveLength(1);
    expect(result[0].productName).toBe("Morning Cleanser");
  });

  it("handles timezone correctly when calculating today's date", async () => {
    // User in London timezone
    // Create yesterday's step (Nov 3) with grace period ending today noon London time
    const yesterday = new Date("2025-11-03T00:00:00Z");
    const deadline = new Date("2025-11-03T12:00:00Z");
    const gracePeriodEnd = new Date("2025-11-04T12:00:00Z");

    await db.insert(schema.routineStepCompletions).values({
      routineProductId: productId1,
      userProfileId: profileId,
      scheduledDate: yesterday,
      scheduledTimeOfDay: "morning",
      onTimeDeadline: deadline,
      gracePeriodEnd: gracePeriodEnd,
      status: "pending",
    });

    // Test at Nov 4, 10am UTC (which is 10am London time in winter)
    const today = new Date("2025-11-04T10:00:00Z");
    const result = await repo.getCatchupSteps(userId, today);

    expect(result).toHaveLength(1);
    expect(result[0].productName).toBe("Morning Cleanser");
  });
});
