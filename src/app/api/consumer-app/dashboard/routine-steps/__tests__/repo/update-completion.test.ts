// Repository integration tests for updating routine step completions
import { describe, it, expect } from "vitest";
import {
  db,
  repo,
  setupCompletionRepoTests,
  createUserProfile,
  createRoutine,
  createRoutineProduct,
  authUserId,
  authUserId2,
  profileId,
  profileId2,
  routineId,
  productId1,
  productId2,
  productId3,
  completionId1,
  completionId2,
  completionId3,
} from "./test-setup";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("CompletionRepo - updateCompletion", () => {
  setupCompletionRepoTests();

  describe("Single Step Operations", () => {
    it("marks single pending step as complete with on-time status", async () => {
      // Setup: Create user profile and routine
      await createUserProfile(profileId, authUserId, "user@test.com");

      await createRoutine(routineId, profileId);
      await createRoutineProduct(productId1, routineId, profileId, "Cleanser");

      // Create pending completion with future deadline (can complete on-time)
      const now = new Date("2025-11-07T08:00:00Z");
      const onTimeDeadline = new Date("2025-11-07T14:00:00Z"); // 6 hours later
      const gracePeriodEnd = new Date("2025-11-07T20:00:00Z"); // 12 hours later

      await db.insert(schema.routineStepCompletions).values({
        id: completionId1,
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline,
        gracePeriodEnd,
        status: "pending",
        completedAt: null,
      });

      // Act: Mark as complete
      const result = await repo.updateCompletion({
        stepId: completionId1,
        completed: true,
        userProfileId: profileId,
        completedAt: now,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(completionId1);
      expect(result?.status).toBe("on-time");
      expect(result?.completedAt).toEqual(now);
    });

    it("marks single pending step as complete with late status", async () => {
      // Setup: Create user profile and routine
      await createUserProfile(profileId, authUserId, "user@test.com");

      await createRoutine(routineId, profileId);
      await createRoutineProduct(productId1, routineId, profileId, "Cleanser");

      // Create pending completion with past on-time deadline but within grace period
      const now = new Date("2025-11-07T15:00:00Z");
      const onTimeDeadline = new Date("2025-11-07T14:00:00Z"); // 1 hour ago
      const gracePeriodEnd = new Date("2025-11-07T20:00:00Z"); // Still within grace

      await db.insert(schema.routineStepCompletions).values({
        id: completionId1,
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline,
        gracePeriodEnd,
        status: "pending",
        completedAt: null,
      });

      // Act: Mark as complete (late)
      const result = await repo.updateCompletion({
        stepId: completionId1,
        completed: true,
        userProfileId: profileId,
        completedAt: now,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(completionId1);
      expect(result?.status).toBe("late");
      expect(result?.completedAt).toEqual(now);
    });

    it("marks completed step as incomplete (reverts to pending)", async () => {
      // Setup: Create user profile and routine
      await createUserProfile(profileId, authUserId, "user@test.com");

      await createRoutine(routineId, profileId);
      await createRoutineProduct(productId1, routineId, profileId, "Cleanser");

      // Create completed step
      const completedAt = new Date("2025-11-07T08:00:00Z");
      const onTimeDeadline = new Date("2025-11-07T14:00:00Z");
      const gracePeriodEnd = new Date("2025-11-07T20:00:00Z");

      await db.insert(schema.routineStepCompletions).values({
        id: completionId1,
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline,
        gracePeriodEnd,
        status: "on-time",
        completedAt,
      });

      // Act: Mark as incomplete
      const result = await repo.updateCompletion({
        stepId: completionId1,
        completed: false,
        userProfileId: profileId,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(completionId1);
      expect(result?.status).toBe("pending");
      expect(result?.completedAt).toBeNull();
    });

    it("returns null when stepId not found", async () => {
      // Setup: Create user profile
      await createUserProfile(profileId, authUserId, "user@test.com");

      // Act: Try to update non-existent step
      const result = await repo.updateCompletion({
        stepId: "00000000-0000-0000-0000-000000000000",
        completed: true,
        userProfileId: profileId,
        completedAt: new Date(),
      });

      // Assert
      expect(result).toBeNull();
    });

    it("does NOT allow completing missed steps", async () => {
      // Setup: Create user profile and routine
      await createUserProfile(profileId, authUserId, "user@test.com");

      await createRoutine(routineId, profileId);
      await createRoutineProduct(productId1, routineId, profileId, "Cleanser");

      // Create missed step (grace period passed)
      const now = new Date("2025-11-07T22:00:00Z");
      const onTimeDeadline = new Date("2025-11-07T14:00:00Z");
      const gracePeriodEnd = new Date("2025-11-07T20:00:00Z"); // 2 hours ago

      await db.insert(schema.routineStepCompletions).values({
        id: completionId1,
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline,
        gracePeriodEnd,
        status: "missed",
        completedAt: null,
      });

      // Act: Try to mark missed step as complete
      const result = await repo.updateCompletion({
        stepId: completionId1,
        completed: true,
        userProfileId: profileId,
        completedAt: now,
      });

      // Assert: Should return null (cannot complete missed steps)
      expect(result).toBeNull();
    });

    it("filters by userProfileId (can't update other user's steps)", async () => {
      // Setup: Create two users with profiles
      await createUserProfile(profileId, authUserId, "user@test.com");

      await createUserProfile(profileId2, authUserId2, "user2@test.com");

      await createRoutine(routineId, profileId);
      await createRoutineProduct(productId1, routineId, profileId, "Cleanser");

      // Create pending completion for user 1
      const onTimeDeadline = new Date("2025-11-07T14:00:00Z");
      const gracePeriodEnd = new Date("2025-11-07T20:00:00Z");

      await db.insert(schema.routineStepCompletions).values({
        id: completionId1,
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline,
        gracePeriodEnd,
        status: "pending",
        completedAt: null,
      });

      // Act: User 2 tries to update user 1's step
      const result = await repo.updateCompletion({
        stepId: completionId1,
        completed: true,
        userProfileId: profileId2, // Wrong user
        completedAt: new Date("2025-11-07T08:00:00Z"),
      });

      // Assert: Should return null (not authorized)
      expect(result).toBeNull();
    });

    it("idempotent - marking already completed step returns existing", async () => {
      // Setup: Create user profile and routine
      await createUserProfile(profileId, authUserId, "user@test.com");

      await createRoutine(routineId, profileId);
      await createRoutineProduct(productId1, routineId, profileId, "Cleanser");

      // Create already completed step
      const firstCompletedAt = new Date("2025-11-07T08:00:00Z");
      const onTimeDeadline = new Date("2025-11-07T14:00:00Z");
      const gracePeriodEnd = new Date("2025-11-07T20:00:00Z");

      await db.insert(schema.routineStepCompletions).values({
        id: completionId1,
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline,
        gracePeriodEnd,
        status: "on-time",
        completedAt: firstCompletedAt,
      });

      // Act: Try to mark as complete again
      const result = await repo.updateCompletion({
        stepId: completionId1,
        completed: true,
        userProfileId: profileId,
        completedAt: new Date("2025-11-07T09:00:00Z"), // Different time
      });

      // Assert: Should return existing completion unchanged
      expect(result).toBeDefined();
      expect(result?.id).toBe(completionId1);
      expect(result?.status).toBe("on-time");
      expect(result?.completedAt).toEqual(firstCompletedAt); // Original time preserved
    });

    it("returns null when trying to complete after grace period", async () => {
      // Setup: Create user profile and routine
      await createUserProfile(profileId, authUserId, "user@test.com");

      await createRoutine(routineId, profileId);
      await createRoutineProduct(productId1, routineId, profileId, "Cleanser");

      // Create pending step with grace period that has passed
      const onTimeDeadline = new Date("2025-11-07T14:00:00Z"); // 2pm
      const gracePeriodEnd = new Date("2025-11-07T20:00:00Z"); // 8pm
      const attemptedCompletionTime = new Date("2025-11-07T22:00:00Z"); // 10pm (past grace)

      await db.insert(schema.routineStepCompletions).values({
        id: completionId1,
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline,
        gracePeriodEnd,
        status: "pending",
        completedAt: null,
      });

      // Act: Try to complete after grace period
      const result = await repo.updateCompletion({
        stepId: completionId1,
        completed: true,
        userProfileId: profileId,
        completedAt: attemptedCompletionTime,
      });

      // Assert: Should return null (past grace period)
      expect(result).toBeNull();

      // Verify step remains pending
      const [step] = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.id, completionId1));
      expect(step.status).toBe("pending");
      expect(step.completedAt).toBeNull();
    });
  });

  describe("Multi-Step Operations", () => {
    it("marks all pending steps for a date as complete", async () => {
      // Setup: Create user profile and routine with 3 products
      await createUserProfile(profileId, authUserId, "user@test.com");

      await createRoutine(routineId, profileId, "Morning Routine");

      await createRoutineProduct(
        productId1,
        routineId,
        profileId,
        "Cleanser",
        1,
      );
      await createRoutineProduct(productId2, routineId, profileId, "Toner", 2);
      await createRoutineProduct(
        productId3,
        routineId,
        profileId,
        "Moisturizer",
        3,
      );

      // Create 3 pending completions for same date
      const now = new Date("2025-11-07T08:00:00Z");
      const onTimeDeadline = new Date("2025-11-07T14:00:00Z");
      const gracePeriodEnd = new Date("2025-11-07T20:00:00Z");

      await db.insert(schema.routineStepCompletions).values([
        {
          id: completionId1,
          routineProductId: productId1,
          userProfileId: profileId,
          scheduledDate: new Date("2025-11-07"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline,
          gracePeriodEnd,
          status: "pending",
          completedAt: null,
        },
        {
          id: completionId2,
          routineProductId: productId2,
          userProfileId: profileId,
          scheduledDate: new Date("2025-11-07"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline,
          gracePeriodEnd,
          status: "pending",
          completedAt: null,
        },
        {
          id: completionId3,
          routineProductId: productId3,
          userProfileId: profileId,
          scheduledDate: new Date("2025-11-07"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline,
          gracePeriodEnd,
          status: "pending",
          completedAt: null,
        },
      ]);

      // Act: Mark all steps for date as complete
      const result = await repo.updateCompletionsByDate({
        date: "2025-11-07",
        completed: true,
        userProfileId: profileId,
        completedAt: now,
      });

      // Assert
      expect(result).toHaveLength(3);
      expect(result.every((r) => r.status === "on-time")).toBe(true);
      expect(
        result.every((r) => r.completedAt?.getTime() === now.getTime()),
      ).toBe(true);
    });

    it("marks all completed steps for a date as incomplete", async () => {
      // Setup: Create user profile and routine with 2 products
      await createUserProfile(profileId, authUserId, "user@test.com");

      await createRoutine(routineId, profileId, "Morning Routine");

      await createRoutineProduct(
        productId1,
        routineId,
        profileId,
        "Cleanser",
        1,
      );
      await createRoutineProduct(productId2, routineId, profileId, "Toner", 2);

      // Create 2 completed steps
      const completedAt = new Date("2025-11-07T08:00:00Z");
      const onTimeDeadline = new Date("2025-11-07T14:00:00Z");
      const gracePeriodEnd = new Date("2025-11-07T20:00:00Z");

      await db.insert(schema.routineStepCompletions).values([
        {
          id: completionId1,
          routineProductId: productId1,
          userProfileId: profileId,
          scheduledDate: new Date("2025-11-07"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline,
          gracePeriodEnd,
          status: "on-time",
          completedAt,
        },
        {
          id: completionId2,
          routineProductId: productId2,
          userProfileId: profileId,
          scheduledDate: new Date("2025-11-07"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline,
          gracePeriodEnd,
          status: "on-time",
          completedAt,
        },
      ]);

      // Act: Mark all steps for date as incomplete
      const result = await repo.updateCompletionsByDate({
        date: "2025-11-07",
        completed: false,
        userProfileId: profileId,
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every((r) => r.status === "pending")).toBe(true);
      expect(result.every((r) => r.completedAt === null)).toBe(true);
    });

    it("handles mixed states correctly", async () => {
      // Setup: Create user profile and routine with 3 products
      await createUserProfile(profileId, authUserId, "user@test.com");

      await createRoutine(routineId, profileId, "Morning Routine");

      await createRoutineProduct(
        productId1,
        routineId,
        profileId,
        "Cleanser",
        1,
      );
      await createRoutineProduct(productId2, routineId, profileId, "Toner", 2);
      await createRoutineProduct(
        productId3,
        routineId,
        profileId,
        "Moisturizer",
        3,
      );

      // Create mixed states: 1 completed, 2 pending
      const completedAt = new Date("2025-11-07T08:00:00Z");
      const onTimeDeadline = new Date("2025-11-07T14:00:00Z");
      const gracePeriodEnd = new Date("2025-11-07T20:00:00Z");

      await db.insert(schema.routineStepCompletions).values([
        {
          id: completionId1,
          routineProductId: productId1,
          userProfileId: profileId,
          scheduledDate: new Date("2025-11-07"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline,
          gracePeriodEnd,
          status: "on-time",
          completedAt,
        },
        {
          id: completionId2,
          routineProductId: productId2,
          userProfileId: profileId,
          scheduledDate: new Date("2025-11-07"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline,
          gracePeriodEnd,
          status: "pending",
          completedAt: null,
        },
        {
          id: completionId3,
          routineProductId: productId3,
          userProfileId: profileId,
          scheduledDate: new Date("2025-11-07"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline,
          gracePeriodEnd,
          status: "pending",
          completedAt: null,
        },
      ]);

      // Act: Mark all as complete
      const result = await repo.updateCompletionsByDate({
        date: "2025-11-07",
        completed: true,
        userProfileId: profileId,
        completedAt: new Date("2025-11-07T09:00:00Z"),
      });

      // Assert: All 3 should be updated
      expect(result).toHaveLength(3);
      expect(result.every((r) => r.status === "on-time")).toBe(true);
      expect(result.every((r) => r.completedAt !== null)).toBe(true);
    });

    it("returns empty array when no steps exist for date", async () => {
      // Setup: Create user profile
      await createUserProfile(profileId, authUserId, "user@test.com");

      // Act: Try to update steps for date with no completions
      const result = await repo.updateCompletionsByDate({
        date: "2025-11-07",
        completed: true,
        userProfileId: profileId,
        completedAt: new Date(),
      });

      // Assert
      expect(result).toEqual([]);
    });

    it("only updates steps for specified date", async () => {
      // Setup: Create user profile and routine
      await createUserProfile(profileId, authUserId, "user@test.com");

      await createRoutine(routineId, profileId, "Morning Routine");

      await createRoutineProduct(
        productId1,
        routineId,
        profileId,
        "Cleanser",
        1,
      );
      await createRoutineProduct(productId2, routineId, profileId, "Toner", 2);

      // Create completions for two different dates
      const onTimeDeadline1 = new Date("2025-11-07T14:00:00Z");
      const gracePeriodEnd1 = new Date("2025-11-07T20:00:00Z");
      const onTimeDeadline2 = new Date("2025-11-08T14:00:00Z");
      const gracePeriodEnd2 = new Date("2025-11-08T20:00:00Z");

      await db.insert(schema.routineStepCompletions).values([
        {
          id: completionId1,
          routineProductId: productId1,
          userProfileId: profileId,
          scheduledDate: new Date("2025-11-07"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: onTimeDeadline1,
          gracePeriodEnd: gracePeriodEnd1,
          status: "pending",
          completedAt: null,
        },
        {
          id: completionId2,
          routineProductId: productId2,
          userProfileId: profileId,
          scheduledDate: new Date("2025-11-08"), // Different date
          scheduledTimeOfDay: "morning",
          onTimeDeadline: onTimeDeadline2,
          gracePeriodEnd: gracePeriodEnd2,
          status: "pending",
          completedAt: null,
        },
      ]);

      // Act: Mark only Nov 7 steps as complete
      const result = await repo.updateCompletionsByDate({
        date: "2025-11-07",
        completed: true,
        userProfileId: profileId,
        completedAt: new Date("2025-11-07T08:00:00Z"),
      });

      // Assert: Only 1 step updated (Nov 7)
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(completionId1);

      // Verify Nov 8 step is still pending
      const nov8Step = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.id, completionId2));
      expect(nov8Step[0].status).toBe("pending");
    });

    it("filters by userProfileId for multi-step", async () => {
      // Setup: Create two users
      await createUserProfile(profileId, authUserId, "user@test.com");
      await createUserProfile(profileId2, authUserId2, "user2@test.com");

      await createRoutine(routineId, profileId);
      await createRoutineProduct(productId1, routineId, profileId, "Cleanser");

      // Create completion for user 1
      const onTimeDeadline = new Date("2025-11-07T14:00:00Z");
      const gracePeriodEnd = new Date("2025-11-07T20:00:00Z");

      await db.insert(schema.routineStepCompletions).values({
        id: completionId1,
        routineProductId: productId1,
        userProfileId: profileId,
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline,
        gracePeriodEnd,
        status: "pending",
        completedAt: null,
      });

      // Act: User 2 tries to update steps for same date
      const result = await repo.updateCompletionsByDate({
        date: "2025-11-07",
        completed: true,
        userProfileId: profileId2, // Wrong user
        completedAt: new Date("2025-11-07T08:00:00Z"),
      });

      // Assert: No steps updated
      expect(result).toEqual([]);

      // Verify user 1's step is still pending
      const user1Step = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.id, completionId1));
      expect(user1Step[0].status).toBe("pending");
    });

    it("skips missed steps in multi-step update", async () => {
      // Setup: Create user profile and routine
      await createUserProfile(profileId, authUserId, "user@test.com");

      await createRoutine(routineId, profileId, "Morning Routine");

      await createRoutineProduct(
        productId1,
        routineId,
        profileId,
        "Cleanser",
        1,
      );
      await createRoutineProduct(productId2, routineId, profileId, "Toner", 2);

      // Create 1 pending and 1 missed step
      const onTimeDeadline = new Date("2025-11-07T14:00:00Z");
      const gracePeriodEnd = new Date("2025-11-07T20:00:00Z");

      await db.insert(schema.routineStepCompletions).values([
        {
          id: completionId1,
          routineProductId: productId1,
          userProfileId: profileId,
          scheduledDate: new Date("2025-11-07"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline,
          gracePeriodEnd,
          status: "pending",
          completedAt: null,
        },
        {
          id: completionId2,
          routineProductId: productId2,
          userProfileId: profileId,
          scheduledDate: new Date("2025-11-07"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline,
          gracePeriodEnd,
          status: "missed", // Already missed
          completedAt: null,
        },
      ]);

      // Act: Try to mark all as complete
      const result = await repo.updateCompletionsByDate({
        date: "2025-11-07",
        completed: true,
        userProfileId: profileId,
        completedAt: new Date("2025-11-07T08:00:00Z"),
      });

      // Assert: Only 1 step updated (skipped missed)
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(completionId1);
      expect(result[0].status).toBe("on-time");

      // Verify missed step is unchanged
      const missedStep = await db
        .select()
        .from(schema.routineStepCompletions)
        .where(eq(schema.routineStepCompletions.id, completionId2));
      expect(missedStep[0].status).toBe("missed");
    });

    it("calculates correct status (on-time/late) for each step", async () => {
      // Setup: Create user profile and routine
      await createUserProfile(profileId, authUserId, "user@test.com");

      await createRoutine(routineId, profileId, "Morning Routine");

      await createRoutineProduct(
        productId1,
        routineId,
        profileId,
        "Cleanser",
        1,
      );
      await createRoutineProduct(productId2, routineId, profileId, "Toner", 2);

      // Create 2 pending steps with different deadlines
      const completedAt = new Date("2025-11-07T15:00:00Z"); // 3pm

      await db.insert(schema.routineStepCompletions).values([
        {
          id: completionId1,
          routineProductId: productId1,
          userProfileId: profileId,
          scheduledDate: new Date("2025-11-07"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-11-07T16:00:00Z"), // 4pm (on-time)
          gracePeriodEnd: new Date("2025-11-07T20:00:00Z"),
          status: "pending",
          completedAt: null,
        },
        {
          id: completionId2,
          routineProductId: productId2,
          userProfileId: profileId,
          scheduledDate: new Date("2025-11-07"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-11-07T14:00:00Z"), // 2pm (late)
          gracePeriodEnd: new Date("2025-11-07T20:00:00Z"),
          status: "pending",
          completedAt: null,
        },
      ]);

      // Act: Mark all as complete at 3pm
      const result = await repo.updateCompletionsByDate({
        date: "2025-11-07",
        completed: true,
        userProfileId: profileId,
        completedAt,
      });

      // Assert: One on-time, one late
      expect(result).toHaveLength(2);

      const step1 = result.find((r) => r.id === completionId1);
      const step2 = result.find((r) => r.id === completionId2);

      expect(step1?.status).toBe("on-time"); // Completed before 4pm deadline
      expect(step2?.status).toBe("late"); // Completed after 2pm deadline
    });
  });
});
