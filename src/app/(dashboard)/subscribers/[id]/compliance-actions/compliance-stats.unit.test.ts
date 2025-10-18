import { describe, it, expect, vi } from "vitest";
import { getComplianceStats } from "./actions";
import { makeRoutineStepCompletionsRepoFake } from "./routine-step-completions.repo.fake";
import { makeRoutineProductsRepoFake } from "../routine-actions/routine.repo.fake";

describe("Compliance Stats - Unit Tests", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440001";
  const routineId = "550e8400-e29b-41d4-a716-446655440002";
  const product1Id = "550e8400-e29b-41d4-a716-446655440010";
  const product2Id = "550e8400-e29b-41d4-a716-446655440011";

  describe("getComplianceStats", () => {
    it("returns correct overall stats for a date range", async () => {
      const completionsRepo = makeRoutineStepCompletionsRepoFake();
      const productsRepo = makeRoutineProductsRepoFake();

      // Setup product
      await productsRepo.create({
        routineId,
        userProfileId: userId,
        routineStep: "Cleanser",
        productName: "Morning Cleanser",
        instructions: "Apply to face",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create completions with different statuses
      await completionsRepo.createMany([
        {
          routineProductId: product1Id,
          userProfileId: userId,
          scheduledDate: new Date("2025-01-10"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-01-10T12:00:00Z"),
          gracePeriodEnd: new Date("2025-01-10T23:59:59Z"),
          completedAt: new Date("2025-01-10T10:00:00Z"),
          status: "on-time",
        },
        {
          routineProductId: product1Id,
          userProfileId: userId,
          scheduledDate: new Date("2025-01-11"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-01-11T12:00:00Z"),
          gracePeriodEnd: new Date("2025-01-11T23:59:59Z"),
          completedAt: new Date("2025-01-11T14:00:00Z"),
          status: "late",
        },
        {
          routineProductId: product1Id,
          userProfileId: userId,
          scheduledDate: new Date("2025-01-12"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-01-12T12:00:00Z"),
          gracePeriodEnd: new Date("2025-01-12T23:59:59Z"),
          completedAt: null,
          status: "missed",
        },
        {
          routineProductId: product1Id,
          userProfileId: userId,
          scheduledDate: new Date("2025-01-13"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-01-13T12:00:00Z"),
          gracePeriodEnd: new Date("2025-01-13T23:59:59Z"),
          completedAt: null,
          status: "pending",
        },
      ]);

      const deps = {
        completionsRepo,
        productsRepo,
      };

      const result = await getComplianceStats(
        userId,
        new Date("2025-01-10"),
        new Date("2025-01-13"),
        deps
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Only 3 count - pending steps are excluded from stats
        expect(result.data.overall.prescribed).toBe(3);
        expect(result.data.overall.onTime).toBe(1);
        expect(result.data.overall.late).toBe(1);
        expect(result.data.overall.missed).toBe(1);
      }
    });

    it("splits stats correctly by AM/PM", async () => {
      const completionsRepo = makeRoutineStepCompletionsRepoFake();
      const productsRepo = makeRoutineProductsRepoFake();

      // Setup AM product
      await productsRepo.create({
        routineId,
        userProfileId: userId,
        routineStep: "Cleanser",
        productName: "Morning Cleanser",
        instructions: "Apply to face",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Setup PM product
      await productsRepo.create({
        routineId,
        userProfileId: userId,
        routineStep: "Night Cream",
        productName: "Night Cream",
        instructions: "Apply at night",
        frequency: "Daily",
        timeOfDay: "evening",
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create AM completions
      await completionsRepo.createMany([
        {
          routineProductId: product1Id,
          userProfileId: userId,
          scheduledDate: new Date("2025-01-10"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-01-10T12:00:00Z"),
          gracePeriodEnd: new Date("2025-01-10T23:59:59Z"),
          completedAt: new Date("2025-01-10T10:00:00Z"),
          status: "on-time",
        },
        {
          routineProductId: product1Id,
          userProfileId: userId,
          scheduledDate: new Date("2025-01-11"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-01-11T12:00:00Z"),
          gracePeriodEnd: new Date("2025-01-11T23:59:59Z"),
          completedAt: null,
          status: "missed",
        },
      ]);

      // Create PM completions
      await completionsRepo.createMany([
        {
          routineProductId: product2Id,
          userProfileId: userId,
          scheduledDate: new Date("2025-01-10"),
          scheduledTimeOfDay: "evening",
          onTimeDeadline: new Date("2025-01-10T22:00:00Z"),
          gracePeriodEnd: new Date("2025-01-10T23:59:59Z"),
          completedAt: new Date("2025-01-10T22:30:00Z"),
          status: "late",
        },
        {
          routineProductId: product2Id,
          userProfileId: userId,
          scheduledDate: new Date("2025-01-11"),
          scheduledTimeOfDay: "evening",
          onTimeDeadline: new Date("2025-01-11T22:00:00Z"),
          gracePeriodEnd: new Date("2025-01-11T23:59:59Z"),
          completedAt: new Date("2025-01-11T21:00:00Z"),
          status: "on-time",
        },
      ]);

      const deps = {
        completionsRepo,
        productsRepo,
      };

      const result = await getComplianceStats(
        userId,
        new Date("2025-01-10"),
        new Date("2025-01-11"),
        deps
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // AM: 1 on-time, 1 missed
        expect(result.data.am.prescribed).toBe(2);
        expect(result.data.am.completed).toBe(1);
        expect(result.data.am.onTime).toBe(1);
        expect(result.data.am.late).toBe(0);
        expect(result.data.am.missed).toBe(1);

        // PM: 1 on-time, 1 late
        expect(result.data.pm.prescribed).toBe(2);
        expect(result.data.pm.completed).toBe(2);
        expect(result.data.pm.onTime).toBe(1);
        expect(result.data.pm.late).toBe(1);
        expect(result.data.pm.missed).toBe(0);
      }
    });

    it("groups stats correctly by product", async () => {
      const completionsRepo = makeRoutineStepCompletionsRepoFake();
      const productsRepo = makeRoutineProductsRepoFake();

      // Setup products
      const cleanser = await productsRepo.create({
        routineId,
        userProfileId: userId,
        routineStep: "Cleanser",
        productName: "Morning Cleanser",
        instructions: "Apply to face",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const serum = await productsRepo.create({
        routineId,
        userProfileId: userId,
        routineStep: "Serum",
        productName: "Vitamin C Serum",
        instructions: "Apply after cleanser",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Cleanser: 2 on-time, 1 missed
      await completionsRepo.createMany([
        {
          routineProductId: cleanser.id,
          userProfileId: userId,
          scheduledDate: new Date("2025-01-10"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-01-10T12:00:00Z"),
          gracePeriodEnd: new Date("2025-01-10T23:59:59Z"),
          completedAt: new Date("2025-01-10T10:00:00Z"),
          status: "on-time",
        },
        {
          routineProductId: cleanser.id,
          userProfileId: userId,
          scheduledDate: new Date("2025-01-11"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-01-11T12:00:00Z"),
          gracePeriodEnd: new Date("2025-01-11T23:59:59Z"),
          completedAt: new Date("2025-01-11T11:00:00Z"),
          status: "on-time",
        },
        {
          routineProductId: cleanser.id,
          userProfileId: userId,
          scheduledDate: new Date("2025-01-12"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-01-12T12:00:00Z"),
          gracePeriodEnd: new Date("2025-01-12T23:59:59Z"),
          completedAt: null,
          status: "missed",
        },
      ]);

      // Serum: 1 on-time, 1 late, 1 missed
      await completionsRepo.createMany([
        {
          routineProductId: serum.id,
          userProfileId: userId,
          scheduledDate: new Date("2025-01-10"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-01-10T12:00:00Z"),
          gracePeriodEnd: new Date("2025-01-10T23:59:59Z"),
          completedAt: new Date("2025-01-10T10:30:00Z"),
          status: "on-time",
        },
        {
          routineProductId: serum.id,
          userProfileId: userId,
          scheduledDate: new Date("2025-01-11"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-01-11T12:00:00Z"),
          gracePeriodEnd: new Date("2025-01-11T23:59:59Z"),
          completedAt: new Date("2025-01-11T14:00:00Z"),
          status: "late",
        },
        {
          routineProductId: serum.id,
          userProfileId: userId,
          scheduledDate: new Date("2025-01-12"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-01-12T12:00:00Z"),
          gracePeriodEnd: new Date("2025-01-12T23:59:59Z"),
          completedAt: null,
          status: "missed",
        },
      ]);

      const deps = {
        completionsRepo,
        productsRepo,
      };

      const result = await getComplianceStats(
        userId,
        new Date("2025-01-10"),
        new Date("2025-01-12"),
        deps
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.steps).toHaveLength(2);

        const cleanserStats = result.data.steps.find((s) => s.productName === "Morning Cleanser");
        expect(cleanserStats).toBeDefined();
        if (cleanserStats) {
          expect(cleanserStats.prescribed).toBe(3);
          expect(cleanserStats.completed).toBe(2);
          expect(cleanserStats.onTime).toBe(2);
          expect(cleanserStats.late).toBe(0);
          expect(cleanserStats.missed).toBe(1);
          expect(cleanserStats.missedDates).toEqual(["Sunday, Jan 12, 2025"]);
        }

        const serumStats = result.data.steps.find((s) => s.productName === "Vitamin C Serum");
        expect(serumStats).toBeDefined();
        if (serumStats) {
          expect(serumStats.prescribed).toBe(3);
          expect(serumStats.completed).toBe(2);
          expect(serumStats.onTime).toBe(1);
          expect(serumStats.late).toBe(1);
          expect(serumStats.missed).toBe(1);
          expect(serumStats.missedDates).toEqual(["Sunday, Jan 12, 2025"]);
        }
      }
    });

    it("excludes pending steps from stats", async () => {
      const completionsRepo = makeRoutineStepCompletionsRepoFake();
      const productsRepo = makeRoutineProductsRepoFake();

      await productsRepo.create({
        routineId,
        userProfileId: userId,
        routineStep: "Cleanser",
        productName: "Morning Cleanser",
        instructions: "Apply to face",
        frequency: "Daily",
        timeOfDay: "morning",
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create mix of completed and pending steps
      await completionsRepo.createMany([
        {
          routineProductId: product1Id,
          userProfileId: userId,
          scheduledDate: new Date("2025-01-10"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-01-10T12:00:00Z"),
          gracePeriodEnd: new Date("2025-01-10T23:59:59Z"),
          completedAt: new Date("2025-01-10T10:00:00Z"),
          status: "on-time",
        },
        {
          routineProductId: product1Id,
          userProfileId: userId,
          scheduledDate: new Date("2025-01-11"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-01-11T12:00:00Z"),
          gracePeriodEnd: new Date("2025-01-11T23:59:59Z"),
          completedAt: null,
          status: "pending",
        },
        {
          routineProductId: product1Id,
          userProfileId: userId,
          scheduledDate: new Date("2025-01-12"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-01-12T12:00:00Z"),
          gracePeriodEnd: new Date("2025-01-12T23:59:59Z"),
          completedAt: null,
          status: "pending",
        },
      ]);

      const deps = {
        completionsRepo,
        productsRepo,
      };

      const result = await getComplianceStats(
        userId,
        new Date("2025-01-10"),
        new Date("2025-01-12"),
        deps
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Only count the 1 completed step, exclude 2 pending
        expect(result.data.overall.prescribed).toBe(1);
        expect(result.data.overall.onTime).toBe(1);
        expect(result.data.overall.late).toBe(0);
        expect(result.data.overall.missed).toBe(0);
      }
    });

    it("returns error when userId is invalid", async () => {
      const deps = {
        completionsRepo: makeRoutineStepCompletionsRepoFake(),
        productsRepo: makeRoutineProductsRepoFake(),
      };

      const result = await getComplianceStats(
        "invalid-id",
        new Date("2025-01-10"),
        new Date("2025-01-12"),
        deps
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid user ID");
      }
    });

    it("returns empty stats when no completions found", async () => {
      const deps = {
        completionsRepo: makeRoutineStepCompletionsRepoFake(),
        productsRepo: makeRoutineProductsRepoFake(),
      };

      const result = await getComplianceStats(
        userId,
        new Date("2025-01-10"),
        new Date("2025-01-12"),
        deps
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.overall.prescribed).toBe(0);
        expect(result.data.overall.onTime).toBe(0);
        expect(result.data.overall.late).toBe(0);
        expect(result.data.overall.missed).toBe(0);
        expect(result.data.am.prescribed).toBe(0);
        expect(result.data.pm.prescribed).toBe(0);
        expect(result.data.steps).toEqual([]);
      }
    });

    it("handles repository errors gracefully", async () => {
      const completionsRepo = makeRoutineStepCompletionsRepoFake();
      completionsRepo.findByUserAndDateRange = async () => {
        throw new Error("Database connection failed");
      };

      const deps = {
        completionsRepo,
        productsRepo: makeRoutineProductsRepoFake(),
      };

      const result = await getComplianceStats(
        userId,
        new Date("2025-01-10"),
        new Date("2025-01-12"),
        deps
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to fetch compliance stats");
      }
    });
  });
});
