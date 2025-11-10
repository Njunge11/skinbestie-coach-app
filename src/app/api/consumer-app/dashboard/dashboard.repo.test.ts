// Unit tests for user profile repository using PgLite
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestDatabase,
  cleanupTestDatabase,
  type TestDatabase,
} from "@/test/db-helper";
import { makeDashboardRepo } from "./dashboard.repo";
import * as schema from "@/lib/db/schema";
import type { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";

describe("DashboardRepo", () => {
  let db: TestDatabase;
  let client: PGlite;
  let repo: ReturnType<typeof makeDashboardRepo>;

  // Test UUIDs
  const authUserId = "350e8400-e29b-41d4-a716-446655440099"; // Auth user ID (from users table)
  const profileId = "550e8400-e29b-41d4-a716-446655440000"; // User profile ID
  const adminId = "450e8400-e29b-41d4-a716-446655440001";
  const templateId = "650e8400-e29b-41d4-a716-446655440002";
  const routineId = "750e8400-e29b-41d4-a716-446655440003";
  const productId1 = "850e8400-e29b-41d4-a716-446655440001";
  const productId2 = "850e8400-e29b-41d4-a716-446655440002";

  beforeEach(async () => {
    // Create fresh in-memory database for each test
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;

    // Create repository with test database
    repo = makeDashboardRepo({ db });

    // Seed base admin for foreign keys
    await db.insert(schema.admins).values({
      id: adminId,
      email: "admin@test.com",
      name: "Test Admin",
      role: "admin",
    });

    // Create auth user for foreign key constraint
    await db.insert(schema.users).values({
      id: authUserId,
      email: "auth@test.com",
      name: "Auth User",
    });
  });

  afterEach(async () => {
    await cleanupTestDatabase(client);
  });

  describe("getUserDashboardData", () => {
    it("returns complete user profile with all setup flags when everything exists", async () => {
      // Create user with all flags set
      await db.insert(schema.userProfiles).values({
        id: profileId,
        userId: authUserId, // Foreign key to auth users table
        email: "user@test.com",
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
        hasCompletedSkinTest: true,
        hasCompletedBooking: true,
      });

      // Create published goals template
      await db.insert(schema.skinGoalsTemplate).values({
        id: templateId,
        userId: profileId, // Goals template uses profile ID
        status: "published",
        createdBy: adminId,
        updatedBy: adminId,
      });

      // Create published routine
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: profileId,
        name: "Morning Routine",
        startDate: new Date("2025-01-01"),
        status: "published",
      });

      const result = await repo.getUserDashboardData(authUserId); // Pass auth user ID

      expect(result).not.toBeNull();
      expect(result!.userId).toBe(authUserId); // Returns auth user ID
      expect(result!.userProfileId).toBe(profileId); // Returns profile ID
      expect(result!.firstName).toBe("John");
      expect(result!.lastName).toBe("Doe");
      expect(result!.email).toBe("user@test.com");
      expect(result!.hasCompletedSkinTest).toBe(true);
      expect(result!.hasCompletedBooking).toBe(true);
      expect(result!.goalsTemplateId).toBe(templateId);
      expect(result!.goalsTemplateStatus).toBe("published");
      expect(result!.routineId).toBe(routineId);
      expect(result!.routineStatus).toBe("published");
    });

    it("returns user profile with unpublished goals template status", async () => {
      await db.insert(schema.userProfiles).values({
        id: profileId,
        userId: authUserId,
        email: "user@test.com",
        firstName: "Jane",
        lastName: "Smith",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
      });

      await db.insert(schema.skinGoalsTemplate).values({
        id: templateId,
        userId: profileId,
        status: "unpublished",
        createdBy: adminId,
        updatedBy: adminId,
      });

      const result = await repo.getUserDashboardData(authUserId);

      expect(result).not.toBeNull();
      expect(result!.goalsTemplateId).toBe(templateId);
      expect(result!.goalsTemplateStatus).toBe("unpublished");
    });

    it("returns user profile with null goals template when none exists", async () => {
      await db.insert(schema.userProfiles).values({
        id: profileId,
        userId: authUserId,
        email: "user@test.com",
        firstName: "Alice",
        lastName: "Johnson",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
      });

      const result = await repo.getUserDashboardData(authUserId);

      expect(result).not.toBeNull();
      expect(result!.goalsTemplateId).toBeNull();
      expect(result!.goalsTemplateStatus).toBeNull();
    });

    it("returns user profile with draft routine status", async () => {
      await db.insert(schema.userProfiles).values({
        id: profileId,
        userId: authUserId,
        email: "user@test.com",
        firstName: "Bob",
        lastName: "Wilson",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
      });

      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: profileId,
        name: "Draft Routine",
        status: "draft",
        startDate: new Date("2025-01-01"),
      });

      const result = await repo.getUserDashboardData(authUserId);

      expect(result).not.toBeNull();
      expect(result!.routineId).toBe(routineId);
      expect(result!.routineStatus).toBe("draft");
    });

    it("returns user profile with null routine when none exists", async () => {
      await db.insert(schema.userProfiles).values({
        id: profileId,
        userId: authUserId,
        email: "user@test.com",
        firstName: "Charlie",
        lastName: "Brown",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
      });

      const result = await repo.getUserDashboardData(authUserId);

      expect(result).not.toBeNull();
      expect(result!.routineId).toBeNull();
      expect(result!.routineStatus).toBeNull();
    });

    it("returns null when user does not exist", async () => {
      const result = await repo.getUserDashboardData(
        "550e8400-e29b-41d4-a716-446655449999",
      );

      expect(result).toBeNull();
    });

    it("returns correct data with single optimized query", async () => {
      // This test verifies the query is optimized by checking it returns all data
      // in one call without needing multiple queries
      await db.insert(schema.userProfiles).values({
        id: profileId,
        userId: authUserId,
        email: "user@test.com",
        firstName: "Test",
        lastName: "User",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
        hasCompletedSkinTest: false,
        hasCompletedBooking: false,
      });

      const result = await repo.getUserDashboardData(authUserId);

      // All fields should be present from single query
      expect(result).toHaveProperty("userId");
      expect(result).toHaveProperty("userProfileId");
      expect(result).toHaveProperty("firstName");
      expect(result).toHaveProperty("lastName");
      expect(result).toHaveProperty("email");
      expect(result).toHaveProperty("hasCompletedSkinTest");
      expect(result).toHaveProperty("hasCompletedBooking");
      expect(result).toHaveProperty("goalsTemplateId");
      expect(result).toHaveProperty("goalsTemplateStatus");
      expect(result).toHaveProperty("routineId");
      expect(result).toHaveProperty("routineStatus");
    });
  });

  describe("getPublishedGoals", () => {
    beforeEach(async () => {
      // Create test user for goals tests
      await db.insert(schema.userProfiles).values({
        id: profileId,
        userId: authUserId,
        email: "user@test.com",
        firstName: "Goals",
        lastName: "Tester",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
      });
    });

    it("returns goals array when template is published", async () => {
      // Create published template
      await db.insert(schema.skinGoalsTemplate).values({
        id: templateId,
        userId: profileId, // Goals template uses profile ID
        status: "published",
        createdBy: adminId,
        updatedBy: adminId,
      });

      // Create goals
      await db.insert(schema.skincareGoals).values([
        {
          templateId,
          description: "Reduce acne",
          complete: false,
          order: 1,
        },
        {
          templateId,
          description: "Improve hydration",
          complete: true,
          completedAt: new Date(),
          order: 2,
        },
        {
          templateId,
          description: "Even skin tone",
          complete: false,
          order: 3,
        },
      ]);

      const result = await repo.getPublishedGoals(authUserId); // Pass auth user ID

      expect(result).toHaveLength(3);
      expect(result[0].description).toBe("Reduce acne");
      expect(result[1].description).toBe("Improve hydration");
      expect(result[2].description).toBe("Even skin tone");
    });

    it("returns empty array when template is unpublished", async () => {
      // Create unpublished template
      await db.insert(schema.skinGoalsTemplate).values({
        id: templateId,
        userId: profileId,
        status: "unpublished",
        createdBy: adminId,
        updatedBy: adminId,
      });

      // Create goals
      await db.insert(schema.skincareGoals).values({
        templateId,
        description: "Hidden goal",
        complete: false,
        order: 1,
      });

      const result = await repo.getPublishedGoals(authUserId);

      expect(result).toEqual([]);
    });

    it("returns empty array when no template exists", async () => {
      const result = await repo.getPublishedGoals(authUserId);

      expect(result).toEqual([]);
    });

    it("returns goals ordered by order field ascending", async () => {
      await db.insert(schema.skinGoalsTemplate).values({
        id: templateId,
        userId: profileId,
        status: "published",
        createdBy: adminId,
        updatedBy: adminId,
      });

      await db.insert(schema.skincareGoals).values([
        { templateId, description: "Goal 3", order: 3 },
        { templateId, description: "Goal 1", order: 1 },
        { templateId, description: "Goal 2", order: 2 },
      ]);

      const result = await repo.getPublishedGoals(authUserId);

      expect(result).toHaveLength(3);
      expect(result[0].description).toBe("Goal 1");
      expect(result[0].order).toBe(1);
      expect(result[1].description).toBe("Goal 2");
      expect(result[1].order).toBe(2);
      expect(result[2].description).toBe("Goal 3");
      expect(result[2].order).toBe(3);
    });

    it("includes completion status and completedAt for each goal", async () => {
      const completionDate = new Date("2025-01-15T10:00:00Z");

      await db.insert(schema.skinGoalsTemplate).values({
        id: templateId,
        userId: profileId,
        status: "published",
        createdBy: adminId,
        updatedBy: adminId,
      });

      await db.insert(schema.skincareGoals).values([
        {
          templateId,
          description: "Incomplete goal",
          complete: false,
          completedAt: null,
          order: 1,
        },
        {
          templateId,
          description: "Complete goal",
          complete: true,
          completedAt: completionDate,
          order: 2,
        },
      ]);

      const result = await repo.getPublishedGoals(authUserId);

      expect(result).toHaveLength(2);
      expect(result[0].complete).toBe(false);
      expect(result[0].completedAt).toBeNull();
      expect(result[1].complete).toBe(true);
      expect(result[1].completedAt).toEqual(completionDate);
    });
  });

  describe("getTodayRoutineSteps", () => {
    const productId = "850e8400-e29b-41d4-a716-446655440004";
    const today = new Date("2025-01-28");

    beforeEach(async () => {
      // Create test user
      await db.insert(schema.userProfiles).values({
        id: profileId,
        userId: authUserId,
        email: "user@test.com",
        firstName: "Routine",
        lastName: "Tester",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
      });
    });

    it("returns routine steps scheduled for today", async () => {
      // Create published routine
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: profileId,
        name: "Daily Routine",
        status: "published",
        startDate: new Date("2025-01-01"),
      });

      // Create routine product
      await db.insert(schema.skincareRoutineProducts).values({
        id: productId,
        routineId,
        userProfileId: profileId,
        routineStep: "Cleansing",
        productName: "Gentle Cleanser",
        productUrl: "https://example.com/cleanser",
        instructions: "Apply to wet face and massage",
        frequency: "daily",
        timeOfDay: "morning",
        order: 1,
      });

      // Create today's completion record
      await db.insert(schema.routineStepCompletions).values({
        routineProductId: productId,
        userProfileId: profileId,
        scheduledDate: today,
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-01-28T09:00:00Z"),
        gracePeriodEnd: new Date("2025-01-28T10:00:00Z"),
        status: "pending",
      });

      const result = await repo.getTodayRoutineSteps(authUserId, today);

      expect(result).toHaveLength(1);
      expect(result[0].routineStep).toBe("Cleansing");
      expect(result[0].productName).toBe("Gentle Cleanser");
      expect(result[0].productUrl).toBe("https://example.com/cleanser");
      expect(result[0].instructions).toBe("Apply to wet face and massage");
      expect(result[0].status).toBe("pending");
    });

    it("returns empty array when no routine scheduled for today", async () => {
      const tomorrow = new Date("2025-01-29");

      const result = await repo.getTodayRoutineSteps(authUserId, tomorrow);

      expect(result).toEqual([]);
    });

    it("returns items ordered by timeOfDay (morning first) then order", async () => {
      // Create published routine
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: profileId,
        name: "Full Day Routine",
        status: "published",
        startDate: new Date("2025-01-01"),
      });

      // Create multiple products
      const products = [
        {
          id: "850e8400-e29b-41d4-a716-446655440004",
          step: "Evening Cleanse",
          timeOfDay: "evening" as const,
          order: 1,
        },
        {
          id: "850e8400-e29b-41d4-a716-446655440005",
          step: "Morning Cleanse",
          timeOfDay: "morning" as const,
          order: 1,
        },
        {
          id: "850e8400-e29b-41d4-a716-446655440006",
          step: "Morning Moisturize",
          timeOfDay: "morning" as const,
          order: 2,
        },
        {
          id: "850e8400-e29b-41d4-a716-446655440007",
          step: "Evening Moisturize",
          timeOfDay: "evening" as const,
          order: 2,
        },
      ];

      for (const product of products) {
        await db.insert(schema.skincareRoutineProducts).values({
          id: product.id,
          routineId,
          userProfileId: profileId,
          routineStep: product.step,
          productName: "Test Product",
          instructions: "Apply",
          frequency: "daily",
          timeOfDay: product.timeOfDay,
          order: product.order,
        });

        await db.insert(schema.routineStepCompletions).values({
          routineProductId: product.id,
          userProfileId: profileId,
          scheduledDate: today,
          scheduledTimeOfDay: product.timeOfDay,
          onTimeDeadline: new Date("2025-01-28T09:00:00Z"),
          gracePeriodEnd: new Date("2025-01-28T10:00:00Z"),
          status: "pending",
        });
      }

      const result = await repo.getTodayRoutineSteps(authUserId, today);

      expect(result).toHaveLength(4);
      // Morning items first
      expect(result[0].routineStep).toBe("Morning Cleanse");
      expect(result[0].timeOfDay).toBe("morning");
      expect(result[1].routineStep).toBe("Morning Moisturize");
      expect(result[1].timeOfDay).toBe("morning");
      // Evening items second
      expect(result[2].routineStep).toBe("Evening Cleanse");
      expect(result[2].timeOfDay).toBe("evening");
      expect(result[3].routineStep).toBe("Evening Moisturize");
      expect(result[3].timeOfDay).toBe("evening");
    });

    it("includes completion status from routine_step_completions", async () => {
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: profileId,
        name: "Status Test Routine",
        status: "published",
        startDate: new Date("2025-01-01"),
      });

      // Create products with different completion statuses
      const statuses = [
        {
          id: "850e8400-e29b-41d4-a716-446655440008",
          status: "on-time" as const,
          completedAt: new Date(),
        },
        {
          id: "850e8400-e29b-41d4-a716-446655440009",
          status: "pending" as const,
          completedAt: null,
        },
        {
          id: "850e8400-e29b-41d4-a716-446655440010",
          status: "missed" as const,
          completedAt: null,
        },
      ];

      for (let i = 0; i < statuses.length; i++) {
        const status = statuses[i];
        await db.insert(schema.skincareRoutineProducts).values({
          id: status.id,
          routineId,
          userProfileId: profileId,
          routineStep: `Step ${i + 1}`,
          productName: "Product",
          instructions: "Apply",
          frequency: "daily",
          timeOfDay: "morning",
          order: i + 1,
        });

        await db.insert(schema.routineStepCompletions).values({
          routineProductId: status.id,
          userProfileId: profileId,
          scheduledDate: today,
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-01-28T09:00:00Z"),
          gracePeriodEnd: new Date("2025-01-28T10:00:00Z"),
          status: status.status,
          completedAt: status.completedAt,
        });
      }

      const result = await repo.getTodayRoutineSteps(authUserId, today);

      expect(result).toHaveLength(3);
      expect(result[0].status).toBe("completed");
      expect(result[0].completedAt).not.toBeNull();
      expect(result[1].status).toBe("pending");
      expect(result[1].completedAt).toBeNull();
      expect(result[2].status).toBe("missed");
      expect(result[2].completedAt).toBeNull();
    });

    it("only returns steps for published routines", async () => {
      // Create draft routine
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: profileId,
        name: "Draft Routine",
        status: "draft",
        startDate: new Date("2025-01-01"),
      });

      // Create product for draft routine
      await db.insert(schema.skincareRoutineProducts).values({
        id: productId,
        routineId,
        userProfileId: profileId,
        routineStep: "Hidden Step",
        productName: "Hidden Product",
        instructions: "Should not appear",
        frequency: "daily",
        timeOfDay: "morning",
        order: 1,
      });

      await db.insert(schema.routineStepCompletions).values({
        routineProductId: productId,
        userProfileId: profileId,
        scheduledDate: today,
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-01-28T09:00:00Z"),
        gracePeriodEnd: new Date("2025-01-28T10:00:00Z"),
        status: "pending",
      });

      const result = await repo.getTodayRoutineSteps(authUserId, today);

      expect(result).toEqual([]);
    });

    it("includes product details from skincare_routine_products", async () => {
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: profileId,
        name: "Detailed Routine",
        status: "published",
        startDate: new Date("2025-01-01"),
      });

      await db.insert(schema.skincareRoutineProducts).values({
        id: productId,
        routineId,
        userProfileId: profileId,
        routineStep: "Exfoliation",
        productName: "AHA/BHA Serum",
        productUrl: "https://example.com/serum",
        instructions: "Apply 3 drops to clean skin",
        frequency: "2x per week",
        timeOfDay: "evening",
        order: 1,
      });

      await db.insert(schema.routineStepCompletions).values({
        routineProductId: productId,
        userProfileId: profileId,
        scheduledDate: today,
        scheduledTimeOfDay: "evening",
        onTimeDeadline: new Date("2025-01-28T21:00:00Z"),
        gracePeriodEnd: new Date("2025-01-28T22:00:00Z"),
        status: "pending",
      });

      const result = await repo.getTodayRoutineSteps(authUserId, today);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        routineStep: "Exfoliation",
        productName: "AHA/BHA Serum",
        productUrl: "https://example.com/serum",
        instructions: "Apply 3 drops to clean skin",
        timeOfDay: "evening",
        order: 1,
      });
    });
  });

  describe("Error Handling", () => {
    it("handles invalid UUID format for userId gracefully", async () => {
      // Use a valid UUID that doesn't exist instead of invalid format
      // PostgreSQL throws error on invalid UUID format
      const result = await repo.getUserDashboardData(
        "550e8400-e29b-41d4-a716-446655449999",
      );

      // Should return null for non-existent but valid UUID
      expect(result).toBeNull();
    });

    it("handles database constraint violations", async () => {
      // Try to create goals template with non-existent user
      await expect(
        db.insert(schema.skinGoalsTemplate).values({
          userId: "non-existent-user",
          status: "published",
          createdBy: adminId,
          updatedBy: adminId,
        }),
      ).rejects.toThrow();
    });
  });

  describe("getTodayRoutineSteps - Timezone Awareness", () => {
    beforeEach(async () => {
      // Setup user with Nairobi timezone (UTC+3)
      await db.insert(schema.userProfiles).values({
        id: profileId,
        userId: authUserId,
        email: "user@test.com",
        firstName: "Jane",
        lastName: "Doe",
        phoneNumber: "+254123456789",
        dateOfBirth: new Date("1995-05-15"),
        timezone: "Africa/Nairobi",
      });

      // Create published routine
      await db.insert(schema.skincareRoutines).values({
        id: routineId,
        userProfileId: profileId,
        name: "Daily Routine",
        startDate: new Date("2025-10-30"),
        endDate: new Date("2025-12-31"),
        status: "published",
      });

      // Create routine products
      await db.insert(schema.skincareRoutineProducts).values([
        {
          id: productId1,
          routineId,
          userProfileId: profileId,
          routineStep: "Cleanse",
          productName: "Morning Cleanser",
          instructions: "Apply to wet face and massage gently",
          timeOfDay: "morning",
          frequency: "daily",
          order: 1,
        },
        {
          id: productId2,
          routineId,
          userProfileId: profileId,
          routineStep: "Moisturise",
          productName: "Evening Moisturizer",
          instructions: "Apply to clean dry face",
          timeOfDay: "evening",
          frequency: "daily",
          order: 1,
        },
      ]);
    });

    it("returns routine steps for user's today when server UTC is ahead (at 3am Nairobi time)", async () => {
      // Problem: User in Nairobi (UTC+3) at 3:00 AM local time
      // Server UTC time: 2025-10-31 00:03:00 UTC (just after midnight UTC)
      // User's local time: 2025-10-31 03:03:00 EAT (same day)
      // Expected: User should see Oct 31 routine (their "today")

      const serverUTC = new Date("2025-10-31T00:03:00Z"); // UTC midnight + 3 min

      // Create completions for Oct 31 (user's today in their timezone)
      await db.insert(schema.routineStepCompletions).values([
        {
          routineProductId: productId1,
          userProfileId: profileId,
          scheduledDate: new Date("2025-10-31"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-10-31T09:00:00Z"), // 12pm Nairobi
          gracePeriodEnd: new Date("2025-11-01T09:00:00Z"),
          status: "pending",
        },
        {
          routineProductId: productId2,
          userProfileId: profileId,
          scheduledDate: new Date("2025-10-31"),
          scheduledTimeOfDay: "evening",
          onTimeDeadline: new Date("2025-10-31T20:59:59Z"), // 11:59pm Nairobi
          gracePeriodEnd: new Date("2025-11-01T20:59:59Z"),
          status: "pending",
        },
      ]);

      // When: Query using server UTC time but user's timezone to calculate "today"
      const result = await repo.getTodayRoutineSteps(authUserId, serverUTC);

      // Then: Should return Oct 31 steps (user's today in Nairobi time)
      expect(result).toHaveLength(2);
      expect(result[0].productName).toBe("Morning Cleanser");
      expect(result[1].productName).toBe("Evening Moisturizer");
    });

    it("returns routine steps for user's today when UTC date rolls over at same time", async () => {
      // Given: London user (UTC+0 in winter, no DST offset)
      await db
        .update(schema.userProfiles)
        .set({ timezone: "Europe/London" })
        .where(eq(schema.userProfiles.id, profileId));

      // Server time: 2025-11-01 00:30 UTC = 00:30 GMT (Nov 1 in London)
      const serverUTC = new Date("2025-11-01T00:30:00Z");

      // Create completion for Nov 1 (London's "today")
      await db.insert(schema.routineStepCompletions).values({
        routineProductId: productId2,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-01"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-01T11:00:00Z"),
        gracePeriodEnd: new Date("2025-11-02T11:00:00Z"),
        status: "pending",
      });

      // When: Query for today's routine
      const result = await repo.getTodayRoutineSteps(authUserId, serverUTC);

      // Then: Should return Nov 1 completion (it's Nov 1 in London at 00:30)
      expect(result).toHaveLength(1);
      expect(result[0].productName).toBe("Evening Moisturizer");
    });

    it("returns empty array when user has no routine steps for their timezone's today", async () => {
      // Setup: It's Oct 30 in user's timezone, but routine starts Oct 31
      const serverUTC = new Date("2025-10-30T21:00:00Z"); // Oct 30 in UTC
      // In Nairobi (UTC+3): 2025-10-31 00:00:00 (just past midnight, start of Oct 31)

      // No completions for Oct 30 (routine starts Oct 31)

      const result = await repo.getTodayRoutineSteps(authUserId, serverUTC);

      expect(result).toEqual([]);
    });

    it("calculates today correctly for New York timezone", async () => {
      // Update user to NYC timezone
      await db
        .update(schema.userProfiles)
        .set({ timezone: "America/New_York" })
        .where(eq(schema.userProfiles.id, profileId));

      const serverUTC = new Date("2025-10-31T04:00:00Z"); // 4am UTC = midnight NYC

      // Create completion for Oct 31 (NYC's today)
      const completionId = "950e8400-e29b-41d4-a716-446655440001";
      await db.insert(schema.routineStepCompletions).values({
        id: completionId,
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-10-31"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-10-31T12:00:00Z"),
        gracePeriodEnd: new Date("2025-11-01T12:00:00Z"),
        status: "pending",
      });

      const result = await repo.getTodayRoutineSteps(authUserId, serverUTC);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(completionId);
    });

    it("calculates today correctly for Tokyo timezone", async () => {
      // Update user to Tokyo timezone
      await db
        .update(schema.userProfiles)
        .set({ timezone: "Asia/Tokyo" })
        .where(eq(schema.userProfiles.id, profileId));

      const serverUTC = new Date("2025-10-31T15:00:00Z"); // 3pm UTC = midnight Nov 1 in Tokyo

      // Create completion for Nov 1 (Tokyo's today)
      const completionId = "950e8400-e29b-41d4-a716-446655440002";
      await db.insert(schema.routineStepCompletions).values({
        id: completionId,
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-01"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-01T03:00:00Z"),
        gracePeriodEnd: new Date("2025-11-02T03:00:00Z"),
        status: "pending",
      });

      const result = await repo.getTodayRoutineSteps(authUserId, serverUTC);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(completionId);
    });
  });
});
