import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestDatabase,
  cleanupTestDatabase,
  type TestDatabase,
} from "@/test/db-helper";
import type { PGlite } from "@electric-sql/pglite";
import * as schema from "@/lib/db/schema";
import { getWeeklyStats, type DashboardStatsDeps } from "./actions";

describe("Dashboard Stats - Integration Tests (PGlite)", () => {
  let db: TestDatabase;
  let client: PGlite;

  // Test UUIDs
  const user1Id = "550e8400-e29b-41d4-a716-446655440000";
  const user2Id = "550e8400-e29b-41d4-a716-446655440001";
  const user3Id = "550e8400-e29b-41d4-a716-446655440002";
  const routine1Id = "750e8400-e29b-41d4-a716-446655440001";
  const routine2Id = "750e8400-e29b-41d4-a716-446655440002";
  const routine3Id = "750e8400-e29b-41d4-a716-446655440003";
  const product1Id = "850e8400-e29b-41d4-a716-446655440001";
  const product2Id = "850e8400-e29b-41d4-a716-446655440002";

  // Fixed dates for testing
  // This week: Nov 10-16, 2025 (Monday-Sunday)
  // Last week: Nov 3-9, 2025 (Monday-Sunday)
  const fixedNow = new Date("2025-11-13T12:00:00Z"); // Thursday of this week
  const thisWeekStart = new Date("2025-11-10T00:00:00Z"); // Monday
  const lastWeekStart = new Date("2025-11-03T00:00:00Z"); // Previous Monday
  const lastWeekEnd = new Date("2025-11-09T23:59:59Z"); // Previous Sunday

  beforeEach(async () => {
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;
  });

  afterEach(async () => {
    await cleanupTestDatabase(client);
  });

  describe("getWeeklyStats - Total Subscribers", () => {
    it("returns 0 total and 0 trend when no users exist", async () => {
      const deps: DashboardStatsDeps = { db, now: () => fixedNow };
      const result = await getWeeklyStats(deps);

      expect(result.totalSubscribers.current).toBe(0);
      expect(result.totalSubscribers.previous).toBe(0);
      expect(result.totalSubscribers.trend).toBe(0);
    });

    it("shows current total vs last week start total (only subscribed users)", async () => {
      // Given: 100 subscribed users before this week started, 30 added this week = 130 total now
      // Create 100 users before this week (before Nov 10)
      const oldUsers = Array.from({ length: 100 }, (_, i) => ({
        id: `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, "0")}`,
        firstName: "User",
        lastName: String(i),
        email: `user${i}@test.com`,
        phoneNumber: `+123456${String(i).padStart(4, "0")}`,
        dateOfBirth: new Date("1990-01-01"),
        isSubscribed: true,
        createdAt: new Date("2025-11-05T10:00:00Z"), // Last week
      }));

      // Create 30 users this week (after Nov 10)
      const newUsers = Array.from({ length: 30 }, (_, i) => ({
        id: `650e8400-e29b-41d4-a716-44665544${String(i).padStart(4, "0")}`,
        firstName: "NewUser",
        lastName: String(i),
        email: `newuser${i}@test.com`,
        phoneNumber: `+223456${String(i).padStart(4, "0")}`,
        dateOfBirth: new Date("1990-01-01"),
        isSubscribed: true,
        createdAt: new Date("2025-11-11T10:00:00Z"), // This week
      }));

      await db.insert(schema.userProfiles).values([...oldUsers, ...newUsers]);

      const deps: DashboardStatsDeps = { db, now: () => fixedNow };
      const result = await getWeeklyStats(deps);

      expect(result.totalSubscribers.current).toBe(130); // Total now
      expect(result.totalSubscribers.previous).toBe(100); // Total at week start
      // Trend: ((130 - 100) / 100) * 100 = 30%
      expect(result.totalSubscribers.trend).toBe(30);
      expect(result.totalSubscribers.isPositive).toBe(true);
    });

    it("calculates positive trend when growth occurred during the week", async () => {
      // Given: 2 subscribed users before this week, 3 subscribed users added this week = 5 total now
      await db.insert(schema.userProfiles).values([
        // Before this week (at week start there were 2 users)
        {
          id: "550e8400-e29b-41d4-a716-446655440003",
          firstName: "User",
          lastName: "Four",
          email: "user4@test.com",
          phoneNumber: "+1234567893",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: true,
          createdAt: new Date("2025-11-05T10:00:00Z"),
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440004",
          firstName: "User",
          lastName: "Five",
          email: "user5@test.com",
          phoneNumber: "+1234567894",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: true,
          createdAt: new Date("2025-11-07T10:00:00Z"),
        },
        // This week (3 new signups)
        {
          id: user1Id,
          firstName: "User",
          lastName: "One",
          email: "user1@test.com",
          phoneNumber: "+1234567890",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: true,
          createdAt: new Date("2025-11-10T10:00:00Z"),
        },
        {
          id: user2Id,
          firstName: "User",
          lastName: "Two",
          email: "user2@test.com",
          phoneNumber: "+1234567891",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: true,
          createdAt: new Date("2025-11-11T10:00:00Z"),
        },
        {
          id: user3Id,
          firstName: "User",
          lastName: "Three",
          email: "user3@test.com",
          phoneNumber: "+1234567892",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: true,
          createdAt: new Date("2025-11-12T10:00:00Z"),
        },
      ]);

      const deps: DashboardStatsDeps = { db, now: () => fixedNow };
      const result = await getWeeklyStats(deps);

      expect(result.totalSubscribers.current).toBe(5); // Total count now
      expect(result.totalSubscribers.previous).toBe(2); // Total at week start
      // Trend: ((5 - 2) / 2) * 100 = 150%
      expect(result.totalSubscribers.trend).toBe(150);
      expect(result.totalSubscribers.isPositive).toBe(true);
    });

    it("shows zero trend when no growth occurred during the week", async () => {
      // Given: 5 subscribed users before this week, 0 users added this week = 5 total (no change)
      await db.insert(schema.userProfiles).values([
        // Before this week
        {
          id: user1Id,
          firstName: "User",
          lastName: "One",
          email: "user1@test.com",
          phoneNumber: "+1234567890",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: true,
          createdAt: new Date("2025-11-05T10:00:00Z"),
        },
        {
          id: user2Id,
          firstName: "User",
          lastName: "Two",
          email: "user2@test.com",
          phoneNumber: "+1234567891",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: true,
          createdAt: new Date("2025-11-06T10:00:00Z"),
        },
        {
          id: user3Id,
          firstName: "User",
          lastName: "Three",
          email: "user3@test.com",
          phoneNumber: "+1234567892",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: true,
          createdAt: new Date("2025-11-07T10:00:00Z"),
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440003",
          firstName: "User",
          lastName: "Four",
          email: "user4@test.com",
          phoneNumber: "+1234567893",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: true,
          createdAt: new Date("2025-11-08T10:00:00Z"),
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440004",
          firstName: "User",
          lastName: "Five",
          email: "user5@test.com",
          phoneNumber: "+1234567894",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: true,
          createdAt: new Date("2025-11-09T10:00:00Z"),
        },
      ]);

      const deps: DashboardStatsDeps = { db, now: () => fixedNow };
      const result = await getWeeklyStats(deps);

      expect(result.totalSubscribers.current).toBe(5); // Total count now
      expect(result.totalSubscribers.previous).toBe(5); // Total at week start (same)
      // Trend: ((5 - 5) / 5) * 100 = 0%
      expect(result.totalSubscribers.trend).toBe(0);
      expect(result.totalSubscribers.isPositive).toBe(true); // Zero is treated as positive
    });

    it("handles infinity case when previous total was 0", async () => {
      // Given: 0 subscribed users at week start, 3 subscribed users added this week = 3 total now
      await db.insert(schema.userProfiles).values([
        {
          id: user1Id,
          firstName: "User",
          lastName: "One",
          email: "user1@test.com",
          phoneNumber: "+1234567890",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: true,
          createdAt: new Date("2025-11-10T10:00:00Z"),
        },
        {
          id: user2Id,
          firstName: "User",
          lastName: "Two",
          email: "user2@test.com",
          phoneNumber: "+1234567891",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: true,
          createdAt: new Date("2025-11-11T10:00:00Z"),
        },
        {
          id: user3Id,
          firstName: "User",
          lastName: "Three",
          email: "user3@test.com",
          phoneNumber: "+1234567892",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: true,
          createdAt: new Date("2025-11-12T10:00:00Z"),
        },
      ]);

      const deps: DashboardStatsDeps = { db, now: () => fixedNow };
      const result = await getWeeklyStats(deps);

      expect(result.totalSubscribers.current).toBe(3); // Total count now
      expect(result.totalSubscribers.previous).toBe(0); // Total at week start was 0
      // When previous is 0, trend should be 100 (infinity treated as 100%)
      expect(result.totalSubscribers.trend).toBe(100);
      expect(result.totalSubscribers.isPositive).toBe(true);
    });

    it("includes all subscribed users in total count regardless of when they were created", async () => {
      // Given: 3 subscribed users created 2 weeks ago, 0 added this week
      await db.insert(schema.userProfiles).values([
        {
          id: user1Id,
          firstName: "User",
          lastName: "One",
          email: "user1@test.com",
          phoneNumber: "+1234567890",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: true,
          createdAt: new Date("2025-10-28T10:00:00Z"), // 2 weeks ago
        },
        {
          id: user2Id,
          firstName: "User",
          lastName: "Two",
          email: "user2@test.com",
          phoneNumber: "+1234567891",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: true,
          createdAt: new Date("2025-10-29T10:00:00Z"), // 2 weeks ago
        },
        {
          id: user3Id,
          firstName: "User",
          lastName: "Three",
          email: "user3@test.com",
          phoneNumber: "+1234567892",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: true,
          createdAt: new Date("2025-10-30T10:00:00Z"), // 2 weeks ago
        },
      ]);

      const deps: DashboardStatsDeps = { db, now: () => fixedNow };
      const result = await getWeeklyStats(deps);

      expect(result.totalSubscribers.current).toBe(3); // Still counts all in total
      expect(result.totalSubscribers.previous).toBe(3); // Same total at week start
      expect(result.totalSubscribers.trend).toBe(0); // No growth this week
    });

    it("excludes non-subscribed users from count", async () => {
      // Given: 5 users total, but only 3 are subscribed
      await db.insert(schema.userProfiles).values([
        {
          id: user1Id,
          firstName: "User",
          lastName: "One",
          email: "user1@test.com",
          phoneNumber: "+1234567890",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: true, // Subscribed
          createdAt: new Date("2025-11-05T10:00:00Z"),
        },
        {
          id: user2Id,
          firstName: "User",
          lastName: "Two",
          email: "user2@test.com",
          phoneNumber: "+1234567891",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: false, // Not subscribed
          createdAt: new Date("2025-11-06T10:00:00Z"),
        },
        {
          id: user3Id,
          firstName: "User",
          lastName: "Three",
          email: "user3@test.com",
          phoneNumber: "+1234567892",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: true, // Subscribed
          createdAt: new Date("2025-11-07T10:00:00Z"),
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440003",
          firstName: "User",
          lastName: "Four",
          email: "user4@test.com",
          phoneNumber: "+1234567893",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: null, // Null (not subscribed)
          createdAt: new Date("2025-11-08T10:00:00Z"),
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440004",
          firstName: "User",
          lastName: "Five",
          email: "user5@test.com",
          phoneNumber: "+1234567894",
          dateOfBirth: new Date("1990-01-01"),
          isSubscribed: true, // Subscribed
          createdAt: new Date("2025-11-09T10:00:00Z"),
        },
      ]);

      const deps: DashboardStatsDeps = { db, now: () => fixedNow };
      const result = await getWeeklyStats(deps);

      expect(result.totalSubscribers.current).toBe(3); // Only 3 subscribed users
      expect(result.totalSubscribers.previous).toBe(3); // Same 3 at week start
    });
  });

  describe("getWeeklyStats - Active Routines", () => {
    beforeEach(async () => {
      // Create user profiles for routines
      await db.insert(schema.userProfiles).values([
        {
          id: user1Id,
          firstName: "User",
          lastName: "One",
          email: "user1@test.com",
          phoneNumber: "+1234567890",
          dateOfBirth: new Date("1990-01-01"),
        },
        {
          id: user2Id,
          firstName: "User",
          lastName: "Two",
          email: "user2@test.com",
          phoneNumber: "+1234567891",
          dateOfBirth: new Date("1990-01-01"),
        },
      ]);
    });

    it("returns 0 for both current and previous when no routines exist", async () => {
      const deps: DashboardStatsDeps = { db, now: () => fixedNow };
      const result = await getWeeklyStats(deps);

      expect(result.activeRoutines.current).toBe(0);
      expect(result.activeRoutines.previous).toBe(0);
      expect(result.activeRoutines.trend).toBe(0);
    });

    it("counts total published routines with weekly growth trend", async () => {
      // Given: 5 published routines before this week, 3 published this week = 8 total
      await db.insert(schema.skincareRoutines).values([
        // Before this week (5 routines)
        {
          id: routine1Id,
          userProfileId: user1Id,
          name: "Routine 1",
          startDate: new Date("2025-11-01"),
          status: "published",
          updatedAt: new Date("2025-11-05T10:00:00Z"),
        },
        {
          id: routine2Id,
          userProfileId: user2Id,
          name: "Routine 2",
          startDate: new Date("2025-11-01"),
          status: "published",
          updatedAt: new Date("2025-11-06T10:00:00Z"),
        },
        {
          id: routine3Id,
          userProfileId: user1Id,
          name: "Routine 3",
          startDate: new Date("2025-11-01"),
          status: "published",
          updatedAt: new Date("2025-11-07T10:00:00Z"),
        },
        {
          id: "750e8400-e29b-41d4-a716-446655440004",
          userProfileId: user2Id,
          name: "Routine 4",
          startDate: new Date("2025-11-01"),
          status: "published",
          updatedAt: new Date("2025-11-08T10:00:00Z"),
        },
        {
          id: "750e8400-e29b-41d4-a716-446655440005",
          userProfileId: user1Id,
          name: "Routine 5",
          startDate: new Date("2025-11-01"),
          status: "published",
          updatedAt: new Date("2025-11-09T10:00:00Z"),
        },
        // This week (3 new routines published)
        {
          id: "750e8400-e29b-41d4-a716-446655440006",
          userProfileId: user2Id,
          name: "Routine 6",
          startDate: new Date("2025-11-01"),
          status: "published",
          updatedAt: new Date("2025-11-10T10:00:00Z"),
        },
        {
          id: "750e8400-e29b-41d4-a716-446655440007",
          userProfileId: user1Id,
          name: "Routine 7",
          startDate: new Date("2025-11-01"),
          status: "published",
          updatedAt: new Date("2025-11-11T10:00:00Z"),
        },
        {
          id: "750e8400-e29b-41d4-a716-446655440008",
          userProfileId: user2Id,
          name: "Routine 8",
          startDate: new Date("2025-11-01"),
          status: "published",
          updatedAt: new Date("2025-11-12T10:00:00Z"),
        },
      ]);

      const deps: DashboardStatsDeps = { db, now: () => fixedNow };
      const result = await getWeeklyStats(deps);

      expect(result.activeRoutines.current).toBe(8); // Total published routines now
      expect(result.activeRoutines.previous).toBe(5); // Total at week start
      // Trend: ((8 - 5) / 5) * 100 = 60%
      expect(result.activeRoutines.trend).toBe(60);
      expect(result.activeRoutines.isPositive).toBe(true);
    });

    it("excludes draft routines from count", async () => {
      // Given: 3 published, 2 draft
      await db.insert(schema.skincareRoutines).values([
        {
          id: routine1Id,
          userProfileId: user1Id,
          name: "Routine 1",
          startDate: new Date("2025-11-01"),
          status: "published",
          updatedAt: new Date("2025-11-05T10:00:00Z"),
        },
        {
          id: routine2Id,
          userProfileId: user2Id,
          name: "Routine 2",
          startDate: new Date("2025-11-01"),
          status: "published",
          updatedAt: new Date("2025-11-06T10:00:00Z"),
        },
        {
          id: routine3Id,
          userProfileId: user1Id,
          name: "Routine 3",
          startDate: new Date("2025-11-01"),
          status: "published",
          updatedAt: new Date("2025-11-07T10:00:00Z"),
        },
        {
          id: "750e8400-e29b-41d4-a716-446655440004",
          userProfileId: user2Id,
          name: "Routine 4",
          startDate: new Date("2025-11-01"),
          status: "draft",
          updatedAt: new Date("2025-11-08T10:00:00Z"),
        },
        {
          id: "750e8400-e29b-41d4-a716-446655440005",
          userProfileId: user1Id,
          name: "Routine 5",
          startDate: new Date("2025-11-01"),
          status: "draft",
          updatedAt: new Date("2025-11-09T10:00:00Z"),
        },
      ]);

      const deps: DashboardStatsDeps = { db, now: () => fixedNow };
      const result = await getWeeklyStats(deps);

      expect(result.activeRoutines.current).toBe(3); // Only count published
    });

    it("shows zero trend when no new routines published this week", async () => {
      // Given: 5 published routines before this week, 0 published this week
      await db.insert(schema.skincareRoutines).values([
        {
          id: routine1Id,
          userProfileId: user1Id,
          name: "Routine 1",
          startDate: new Date("2025-11-01"),
          status: "published",
          updatedAt: new Date("2025-11-05T10:00:00Z"),
        },
        {
          id: routine2Id,
          userProfileId: user2Id,
          name: "Routine 2",
          startDate: new Date("2025-11-01"),
          status: "published",
          updatedAt: new Date("2025-11-06T10:00:00Z"),
        },
        {
          id: routine3Id,
          userProfileId: user1Id,
          name: "Routine 3",
          startDate: new Date("2025-11-01"),
          status: "published",
          updatedAt: new Date("2025-11-07T10:00:00Z"),
        },
        {
          id: "750e8400-e29b-41d4-a716-446655440004",
          userProfileId: user2Id,
          name: "Routine 4",
          startDate: new Date("2025-11-01"),
          status: "published",
          updatedAt: new Date("2025-11-08T10:00:00Z"),
        },
        {
          id: "750e8400-e29b-41d4-a716-446655440005",
          userProfileId: user1Id,
          name: "Routine 5",
          startDate: new Date("2025-11-01"),
          status: "published",
          updatedAt: new Date("2025-11-09T10:00:00Z"),
        },
      ]);

      const deps: DashboardStatsDeps = { db, now: () => fixedNow };
      const result = await getWeeklyStats(deps);

      expect(result.activeRoutines.current).toBe(5); // Total now
      expect(result.activeRoutines.previous).toBe(5); // Total at week start (same)
      // Trend: ((5 - 5) / 5) * 100 = 0%
      expect(result.activeRoutines.trend).toBe(0);
      expect(result.activeRoutines.isPositive).toBe(true);
    });
  });

  describe("getWeeklyStats - Weekly Active Users", () => {
    beforeEach(async () => {
      // Create users and routines for completions
      await db.insert(schema.userProfiles).values([
        {
          id: user1Id,
          firstName: "User",
          lastName: "One",
          email: "user1@test.com",
          phoneNumber: "+1234567890",
          dateOfBirth: new Date("1990-01-01"),
        },
        {
          id: user2Id,
          firstName: "User",
          lastName: "Two",
          email: "user2@test.com",
          phoneNumber: "+1234567891",
          dateOfBirth: new Date("1990-01-01"),
        },
        {
          id: user3Id,
          firstName: "User",
          lastName: "Three",
          email: "user3@test.com",
          phoneNumber: "+1234567892",
          dateOfBirth: new Date("1990-01-01"),
        },
      ]);

      await db.insert(schema.skincareRoutines).values([
        {
          id: routine1Id,
          userProfileId: user1Id,
          name: "Routine 1",
          startDate: new Date("2025-11-01"),
          status: "published",
        },
        {
          id: routine2Id,
          userProfileId: user2Id,
          name: "Routine 2",
          startDate: new Date("2025-11-01"),
          status: "published",
        },
        {
          id: routine3Id,
          userProfileId: user3Id,
          name: "Routine 3",
          startDate: new Date("2025-11-01"),
          status: "published",
        },
      ]);

      await db.insert(schema.skincareRoutineProducts).values([
        {
          id: product1Id,
          routineId: routine1Id,
          userProfileId: user1Id,
          routineStep: "cleanse",
          productName: "Cleanser",
          instructions: "Apply daily",
          frequency: "daily",
          timeOfDay: "morning",
          order: 1,
        },
        {
          id: product2Id,
          routineId: routine2Id,
          userProfileId: user2Id,
          routineStep: "moisturize",
          productName: "Moisturizer",
          instructions: "Apply daily",
          frequency: "daily",
          timeOfDay: "evening",
          order: 1,
        },
      ]);
    });

    it("returns 0 for both weeks when no completions exist", async () => {
      const deps: DashboardStatsDeps = { db, now: () => fixedNow };
      const result = await getWeeklyStats(deps);

      expect(result.weeklyActiveUsers.current).toBe(0);
      expect(result.weeklyActiveUsers.previous).toBe(0);
    });

    it("counts distinct users with completions this week", async () => {
      // Given: User 1 completed 2 steps, User 2 completed 1 step
      await db.insert(schema.routineStepCompletions).values([
        {
          routineProductId: product1Id,
          userProfileId: user1Id,
          scheduledDate: new Date("2025-11-11"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-11-11T14:00:00Z"),
          gracePeriodEnd: new Date("2025-11-11T20:00:00Z"),
          completedAt: new Date("2025-11-11T10:00:00Z"),
          status: "on-time",
        },
        {
          routineProductId: product1Id,
          userProfileId: user1Id,
          scheduledDate: new Date("2025-11-12"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-11-12T14:00:00Z"),
          gracePeriodEnd: new Date("2025-11-12T20:00:00Z"),
          completedAt: new Date("2025-11-12T10:00:00Z"),
          status: "on-time",
        },
        {
          routineProductId: product2Id,
          userProfileId: user2Id,
          scheduledDate: new Date("2025-11-11"),
          scheduledTimeOfDay: "evening",
          onTimeDeadline: new Date("2025-11-11T22:00:00Z"),
          gracePeriodEnd: new Date("2025-11-12T04:00:00Z"),
          completedAt: new Date("2025-11-11T21:00:00Z"),
          status: "on-time",
        },
      ]);

      const deps: DashboardStatsDeps = { db, now: () => fixedNow };
      const result = await getWeeklyStats(deps);

      // Should count 2 distinct users (user1 and user2)
      expect(result.weeklyActiveUsers.current).toBe(2);
    });

    it("excludes pending and missed completions", async () => {
      // Given: 1 on-time, 1 late (both count), 1 pending, 1 missed (both don't count)
      await db.insert(schema.routineStepCompletions).values([
        {
          routineProductId: product1Id,
          userProfileId: user1Id,
          scheduledDate: new Date("2025-11-11"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-11-11T14:00:00Z"),
          gracePeriodEnd: new Date("2025-11-11T20:00:00Z"),
          completedAt: new Date("2025-11-11T10:00:00Z"),
          status: "on-time",
        },
        {
          routineProductId: product2Id,
          userProfileId: user2Id,
          scheduledDate: new Date("2025-11-11"),
          scheduledTimeOfDay: "evening",
          onTimeDeadline: new Date("2025-11-11T22:00:00Z"),
          gracePeriodEnd: new Date("2025-11-12T04:00:00Z"),
          completedAt: new Date("2025-11-11T23:00:00Z"),
          status: "late",
        },
        {
          routineProductId: product1Id,
          userProfileId: user3Id,
          scheduledDate: new Date("2025-11-12"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-11-12T14:00:00Z"),
          gracePeriodEnd: new Date("2025-11-12T20:00:00Z"),
          completedAt: null,
          status: "pending",
        },
        {
          routineProductId: product1Id,
          userProfileId: user3Id,
          scheduledDate: new Date("2025-11-10"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-11-10T14:00:00Z"),
          gracePeriodEnd: new Date("2025-11-10T20:00:00Z"),
          completedAt: null,
          status: "missed",
        },
      ]);

      const deps: DashboardStatsDeps = { db, now: () => fixedNow };
      const result = await getWeeklyStats(deps);

      // Should count only user1 and user2 (on-time and late)
      expect(result.weeklyActiveUsers.current).toBe(2);
    });

    it("calculates trend correctly", async () => {
      // Given: 2 users this week, 1 user last week
      await db.insert(schema.routineStepCompletions).values([
        // This week
        {
          routineProductId: product1Id,
          userProfileId: user1Id,
          scheduledDate: new Date("2025-11-11"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-11-11T14:00:00Z"),
          gracePeriodEnd: new Date("2025-11-11T20:00:00Z"),
          completedAt: new Date("2025-11-11T10:00:00Z"),
          status: "on-time",
        },
        {
          routineProductId: product2Id,
          userProfileId: user2Id,
          scheduledDate: new Date("2025-11-11"),
          scheduledTimeOfDay: "evening",
          onTimeDeadline: new Date("2025-11-11T22:00:00Z"),
          gracePeriodEnd: new Date("2025-11-12T04:00:00Z"),
          completedAt: new Date("2025-11-11T21:00:00Z"),
          status: "on-time",
        },
        // Last week
        {
          routineProductId: product1Id,
          userProfileId: user1Id,
          scheduledDate: new Date("2025-11-05"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-11-05T14:00:00Z"),
          gracePeriodEnd: new Date("2025-11-05T20:00:00Z"),
          completedAt: new Date("2025-11-05T10:00:00Z"),
          status: "on-time",
        },
      ]);

      const deps: DashboardStatsDeps = { db, now: () => fixedNow };
      const result = await getWeeklyStats(deps);

      expect(result.weeklyActiveUsers.current).toBe(2);
      expect(result.weeklyActiveUsers.previous).toBe(1);
      // Trend: ((2 - 1) / 1) * 100 = 100%
      expect(result.weeklyActiveUsers.trend).toBe(100);
      expect(result.weeklyActiveUsers.isPositive).toBe(true);
    });
  });
});
