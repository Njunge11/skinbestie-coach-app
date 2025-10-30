// Service layer tests for consumer app goals API
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeGoalsService, type GoalsServiceDeps } from "./goals.service";
import { makeGoal } from "@/test/factories";
import { makeGoalsRepo } from "@/app/(dashboard)/subscribers/[id]/goal-actions/goals.repo";
import { makeGoalsTemplateRepo } from "@/app/(dashboard)/subscribers/[id]/goal-actions/goals-template.repo";
import type { GoalsTemplate } from "@/app/(dashboard)/subscribers/[id]/goal-actions/goals-template.repo";

// Mock repository types using ReturnType
type GoalsRepo = ReturnType<typeof makeGoalsRepo>;
type GoalsTemplateRepo = ReturnType<typeof makeGoalsTemplateRepo>;

type MockGoalsRepo = {
  [K in keyof GoalsRepo]: ReturnType<typeof vi.fn>;
};

type MockTemplateRepo = {
  [K in keyof GoalsTemplateRepo]: ReturnType<typeof vi.fn>;
};

type MockUserProfileRepo = {
  getUserProfileIdByUserId: ReturnType<typeof vi.fn>;
};

describe("GoalsService - Create Goal", () => {
  // Test UUIDs
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const userProfileId = "650e8400-e29b-41d4-a716-446655440000";
  const templateId = "750e8400-e29b-41d4-a716-446655440000";
  const goalId = "850e8400-e29b-41d4-a716-446655440000";

  let mockGoalsRepo: MockGoalsRepo;
  let mockTemplateRepo: MockTemplateRepo;
  let mockUserProfileRepo: MockUserProfileRepo;
  let service: ReturnType<typeof makeGoalsService>;
  const fixedNow = new Date("2025-01-15T10:30:00Z");

  beforeEach(() => {
    mockGoalsRepo = {
      findByTemplateId: vi.fn(),
      unmarkAllPrimary: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      toggleComplete: vi.fn(),
      deleteById: vi.fn(),
      updateMany: vi.fn(),
    };

    mockTemplateRepo = {
      findByUserId: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      deleteById: vi.fn(),
      updateAcknowledgment: vi.fn(),
    };

    mockUserProfileRepo = {
      getUserProfileIdByUserId: vi.fn(),
    };

    const deps: GoalsServiceDeps = {
      goalsRepo: mockGoalsRepo as GoalsRepo,
      templateRepo: mockTemplateRepo as GoalsTemplateRepo,
      userProfileRepo: mockUserProfileRepo,
      now: () => fixedNow,
    };

    service = makeGoalsService(deps);
  });

  describe("Happy Path", () => {
    it("creates goal successfully with all required fields", async () => {
      // Given: User has a template
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(
        userProfileId,
      );
      mockTemplateRepo.findByUserId.mockResolvedValue({
        id: templateId,
        userId: userProfileId,
        status: "published",
        goalsAcknowledgedByClient: false,
      } as unknown as GoalsTemplate);

      mockGoalsRepo.findByTemplateId.mockResolvedValue([]);

      const createdGoal = makeGoal({
        id: goalId,
        templateId,
        description: "Clear skin",
        isPrimaryGoal: false,
        complete: false,
        completedAt: null,
        order: 0,
        createdAt: fixedNow,
        updatedAt: fixedNow,
      });

      mockGoalsRepo.create.mockResolvedValue(createdGoal);

      // When: Creating a goal
      const result = await service.createGoal(userId, {
        description: "Clear skin",
      });

      // Then: Goal is created successfully
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe("Clear skin");
        expect(result.data.isPrimaryGoal).toBe(false);
        expect(result.data.complete).toBe(false);
        expect(result.data.order).toBe(0);
        expect(result.data.createdAt).toEqual(fixedNow);
        expect(result.data.updatedAt).toEqual(fixedNow);
      }
    });

    it("assigns correct order for first goal (order: 0)", async () => {
      // Given: Template exists with no goals
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(
        userProfileId,
      );
      mockTemplateRepo.findByUserId.mockResolvedValue({
        id: templateId,
        userId: userProfileId,
      } as unknown as GoalsTemplate);
      mockGoalsRepo.findByTemplateId.mockResolvedValue([]);

      const createdGoal = makeGoal({ order: 0 });
      mockGoalsRepo.create.mockResolvedValue(createdGoal);

      // When: Creating first goal
      const result = await service.createGoal(userId, {
        description: "Goal 1",
      });

      // Then: Order is 0
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe(0);
      }
    });

    it("assigns incremented order for subsequent goals", async () => {
      // Given: Template has 2 existing goals
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(
        userProfileId,
      );
      mockTemplateRepo.findByUserId.mockResolvedValue({
        id: templateId,
        userId: userProfileId,
      } as unknown as GoalsTemplate);

      const existingGoals = [makeGoal({ order: 0 }), makeGoal({ order: 1 })];
      mockGoalsRepo.findByTemplateId.mockResolvedValue(existingGoals);

      const createdGoal = makeGoal({ order: 2 });
      mockGoalsRepo.create.mockResolvedValue(createdGoal);

      // When: Creating third goal
      const result = await service.createGoal(userId, {
        description: "Goal 3",
      });

      // Then: Order is 2 (max + 1)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe(2);
      }
    });

    it("sets isPrimaryGoal to false by default", async () => {
      // Given: Template exists
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(
        userProfileId,
      );
      mockTemplateRepo.findByUserId.mockResolvedValue({
        id: templateId,
        userId: userProfileId,
      } as unknown as GoalsTemplate);
      mockGoalsRepo.findByTemplateId.mockResolvedValue([]);

      const createdGoal = makeGoal({ isPrimaryGoal: false });
      mockGoalsRepo.create.mockResolvedValue(createdGoal);

      // When: Creating goal without isPrimaryGoal
      const result = await service.createGoal(userId, { description: "Goal" });

      // Then: isPrimaryGoal is false
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isPrimaryGoal).toBe(false);
      }
    });

    it("unmarks other primary goals when creating new primary goal", async () => {
      // Given: Template exists
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(
        userProfileId,
      );
      mockTemplateRepo.findByUserId.mockResolvedValue({
        id: templateId,
        userId: userProfileId,
      } as unknown as GoalsTemplate);
      mockGoalsRepo.findByTemplateId.mockResolvedValue([]);
      mockGoalsRepo.unmarkAllPrimary.mockResolvedValue(undefined);

      const createdGoal = makeGoal({ isPrimaryGoal: true });
      mockGoalsRepo.create.mockResolvedValue(createdGoal);

      // When: Creating a primary goal
      const result = await service.createGoal(userId, {
        description: "Primary goal",
        isPrimaryGoal: true,
      });

      // Then: unmarkAllPrimary was called
      expect(mockGoalsRepo.unmarkAllPrimary).toHaveBeenCalledWith(templateId);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isPrimaryGoal).toBe(true);
      }
    });

    it("sets timestamps correctly (createdAt, updatedAt)", async () => {
      // Given: Template exists
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(
        userProfileId,
      );
      mockTemplateRepo.findByUserId.mockResolvedValue({
        id: templateId,
        userId: userProfileId,
      } as unknown as GoalsTemplate);
      mockGoalsRepo.findByTemplateId.mockResolvedValue([]);

      const createdGoal = makeGoal({
        createdAt: fixedNow,
        updatedAt: fixedNow,
      });
      mockGoalsRepo.create.mockResolvedValue(createdGoal);

      // When: Creating goal
      const result = await service.createGoal(userId, { description: "Goal" });

      // Then: Timestamps are set to fixedNow
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.createdAt).toEqual(fixedNow);
        expect(result.data.updatedAt).toEqual(fixedNow);
      }
    });
  });

  describe("Validation", () => {
    it("returns error when userId is invalid UUID format", async () => {
      // When: Creating goal with invalid userId
      const result = await service.createGoal("invalid-uuid", {
        description: "Goal",
      });

      // Then: Returns validation error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid user ID");
      }
    });

    it("returns error when description is empty string", async () => {
      // When: Creating goal with empty description
      const result = await service.createGoal(userId, {
        description: "",
      });

      // Then: Returns validation error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when description is whitespace only", async () => {
      // When: Creating goal with whitespace description
      const result = await service.createGoal(userId, {
        description: "   ",
      });

      // Then: Returns validation error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });

  describe("Error Handling", () => {
    it("returns error when template doesn't exist", async () => {
      // Given: User has no template
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(
        userProfileId,
      );
      mockTemplateRepo.findByUserId.mockResolvedValue(null);

      // When: Creating goal
      const result = await service.createGoal(userId, {
        description: "Goal",
      });

      // Then: Returns error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Goals template not found");
      }
    });

    it("returns error when user profile not found", async () => {
      // Given: User profile doesn't exist
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(null);

      // When: Creating goal
      const result = await service.createGoal(userId, {
        description: "Goal",
      });

      // Then: Returns error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User not found");
      }
    });

    it("handles repository errors when fetching user profile", async () => {
      // Given: Repository throws error
      mockUserProfileRepo.getUserProfileIdByUserId.mockRejectedValue(
        new Error("Database connection failed"),
      );

      // When: Creating goal
      const result = await service.createGoal(userId, {
        description: "Goal",
      });

      // Then: Returns error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to create goal");
      }
    });

    it("handles repository errors when fetching template", async () => {
      // Given: Repository throws error
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(
        userProfileId,
      );
      mockTemplateRepo.findByUserId.mockRejectedValue(
        new Error("Database connection failed"),
      );

      // When: Creating goal
      const result = await service.createGoal(userId, {
        description: "Goal",
      });

      // Then: Returns error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to create goal");
      }
    });

    it("handles repository errors when creating goal", async () => {
      // Given: Template exists but create fails
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(
        userProfileId,
      );
      mockTemplateRepo.findByUserId.mockResolvedValue({
        id: templateId,
        userId: userProfileId,
      } as unknown as GoalsTemplate);
      mockGoalsRepo.findByTemplateId.mockResolvedValue([]);
      mockGoalsRepo.create.mockRejectedValue(
        new Error("Database connection failed"),
      );

      // When: Creating goal
      const result = await service.createGoal(userId, {
        description: "Goal",
      });

      // Then: Returns error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to create goal");
      }
    });
  });
});

describe("GoalsService - Update Goal", () => {
  // Test UUIDs
  const templateId = "750e8400-e29b-41d4-a716-446655440000";
  const goalId = "850e8400-e29b-41d4-a716-446655440000";

  let mockGoalsRepo: MockGoalsRepo;
  let mockTemplateRepo: MockTemplateRepo;
  let mockUserProfileRepo: MockUserProfileRepo;
  let service: ReturnType<typeof makeGoalsService>;
  const fixedNow = new Date("2025-01-15T10:30:00Z");
  const olderDate = new Date("2025-01-01T00:00:00Z");

  beforeEach(() => {
    mockGoalsRepo = {
      findByTemplateId: vi.fn(),
      unmarkAllPrimary: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      toggleComplete: vi.fn(),
      deleteById: vi.fn(),
      updateMany: vi.fn(),
    };

    mockTemplateRepo = {
      findByUserId: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      deleteById: vi.fn(),
      updateAcknowledgment: vi.fn(),
    };

    mockUserProfileRepo = {
      getUserProfileIdByUserId: vi.fn(),
    };

    const deps: GoalsServiceDeps = {
      goalsRepo: mockGoalsRepo as GoalsRepo,
      templateRepo: mockTemplateRepo as GoalsTemplateRepo,
      userProfileRepo: mockUserProfileRepo,
      now: () => fixedNow,
    };

    service = makeGoalsService(deps);
  });

  describe("Happy Path", () => {
    it("updates goal description successfully", async () => {
      const existingGoal = makeGoal({
        id: goalId,
        templateId,
        description: "Old description",
        createdAt: olderDate,
        updatedAt: olderDate,
      });

      mockGoalsRepo.findById.mockResolvedValue(existingGoal);

      const updatedGoal = makeGoal({
        ...existingGoal,
        description: "New description",
        updatedAt: fixedNow,
      });
      mockGoalsRepo.update.mockResolvedValue(updatedGoal);

      const result = await service.updateGoal(goalId, {
        description: "New description",
      });

      expect(result.success).toBe(true);
      expect(mockGoalsRepo.update).toHaveBeenCalledWith(
        goalId,
        expect.objectContaining({
          description: "New description",
          updatedAt: fixedNow,
        }),
      );
    });

    it("updates isPrimaryGoal successfully", async () => {
      const existingGoal = makeGoal({
        id: goalId,
        templateId,
        isPrimaryGoal: false,
      });

      mockGoalsRepo.findById.mockResolvedValue(existingGoal);
      mockGoalsRepo.unmarkAllPrimary.mockResolvedValue(undefined);

      const updatedGoal = makeGoal({
        ...existingGoal,
        isPrimaryGoal: true,
        updatedAt: fixedNow,
      });
      mockGoalsRepo.update.mockResolvedValue(updatedGoal);

      const result = await service.updateGoal(goalId, {
        isPrimaryGoal: true,
      });

      expect(result.success).toBe(true);
      expect(mockGoalsRepo.unmarkAllPrimary).toHaveBeenCalledWith(templateId);
    });

    it("updates complete status successfully", async () => {
      const existingGoal = makeGoal({
        id: goalId,
        templateId,
        complete: false,
        completedAt: null,
      });

      mockGoalsRepo.findById.mockResolvedValue(existingGoal);

      const updatedGoal = makeGoal({
        ...existingGoal,
        complete: true,
        completedAt: fixedNow,
        updatedAt: fixedNow,
      });
      mockGoalsRepo.update.mockResolvedValue(updatedGoal);

      const result = await service.updateGoal(goalId, {
        complete: true,
      });

      expect(result.success).toBe(true);
      expect(mockGoalsRepo.update).toHaveBeenCalledWith(
        goalId,
        expect.objectContaining({
          complete: true,
          completedAt: fixedNow,
          updatedAt: fixedNow,
        }),
      );
    });

    it("sets completedAt when marking complete", async () => {
      const existingGoal = makeGoal({
        id: goalId,
        templateId,
        complete: false,
        completedAt: null,
      });

      mockGoalsRepo.findById.mockResolvedValue(existingGoal);
      mockGoalsRepo.update.mockResolvedValue(
        makeGoal({ ...existingGoal, complete: true, completedAt: fixedNow }),
      );

      const result = await service.updateGoal(goalId, { complete: true });

      expect(result.success).toBe(true);
      expect(mockGoalsRepo.update).toHaveBeenCalledWith(
        goalId,
        expect.objectContaining({
          completedAt: fixedNow,
        }),
      );
    });

    it("clears completedAt when marking incomplete", async () => {
      const existingGoal = makeGoal({
        id: goalId,
        templateId,
        complete: true,
        completedAt: olderDate,
      });

      mockGoalsRepo.findById.mockResolvedValue(existingGoal);
      mockGoalsRepo.update.mockResolvedValue(
        makeGoal({ ...existingGoal, complete: false, completedAt: null }),
      );

      const result = await service.updateGoal(goalId, { complete: false });

      expect(result.success).toBe(true);
      expect(mockGoalsRepo.update).toHaveBeenCalledWith(
        goalId,
        expect.objectContaining({
          completedAt: null,
        }),
      );
    });

    it("updates updatedAt timestamp", async () => {
      const existingGoal = makeGoal({
        id: goalId,
        templateId,
        updatedAt: olderDate,
      });

      mockGoalsRepo.findById.mockResolvedValue(existingGoal);
      mockGoalsRepo.update.mockResolvedValue(
        makeGoal({ ...existingGoal, updatedAt: fixedNow }),
      );

      const result = await service.updateGoal(goalId, {
        description: "Updated",
      });

      expect(result.success).toBe(true);
      expect(mockGoalsRepo.update).toHaveBeenCalledWith(
        goalId,
        expect.objectContaining({
          updatedAt: fixedNow,
        }),
      );
    });

    it("does NOT update createdAt", async () => {
      const existingGoal = makeGoal({
        id: goalId,
        templateId,
        createdAt: olderDate,
      });

      mockGoalsRepo.findById.mockResolvedValue(existingGoal);
      mockGoalsRepo.update.mockResolvedValue(existingGoal);

      await service.updateGoal(goalId, { description: "Updated" });

      expect(mockGoalsRepo.update).toHaveBeenCalledWith(
        goalId,
        expect.not.objectContaining({
          createdAt: expect.anything(),
        }),
      );
    });

    it("unmarks other primary goals when setting isPrimaryGoal to true", async () => {
      const existingGoal = makeGoal({
        id: goalId,
        templateId,
        isPrimaryGoal: false,
      });

      mockGoalsRepo.findById.mockResolvedValue(existingGoal);
      mockGoalsRepo.unmarkAllPrimary.mockResolvedValue(undefined);
      mockGoalsRepo.update.mockResolvedValue(
        makeGoal({ ...existingGoal, isPrimaryGoal: true }),
      );

      const result = await service.updateGoal(goalId, { isPrimaryGoal: true });

      expect(mockGoalsRepo.unmarkAllPrimary).toHaveBeenCalledWith(templateId);
      expect(result.success).toBe(true);
    });

    it("handles partial updates (only fields provided)", async () => {
      const existingGoal = makeGoal({
        id: goalId,
        templateId,
        description: "Original",
        isPrimaryGoal: false,
        complete: false,
      });

      mockGoalsRepo.findById.mockResolvedValue(existingGoal);
      mockGoalsRepo.update.mockResolvedValue(
        makeGoal({ ...existingGoal, description: "Updated" }),
      );

      await service.updateGoal(goalId, { description: "Updated" });

      expect(mockGoalsRepo.update).toHaveBeenCalledWith(
        goalId,
        expect.objectContaining({
          description: "Updated",
        }),
      );
      expect(mockGoalsRepo.update).toHaveBeenCalledWith(
        goalId,
        expect.not.objectContaining({
          isPrimaryGoal: expect.anything(),
          complete: expect.anything(),
        }),
      );
    });

    it("handles empty update object (no-op)", async () => {
      const existingGoal = makeGoal({
        id: goalId,
        templateId,
      });

      mockGoalsRepo.findById.mockResolvedValue(existingGoal);
      mockGoalsRepo.update.mockResolvedValue(existingGoal);

      const result = await service.updateGoal(goalId, {});

      expect(result.success).toBe(true);
      expect(mockGoalsRepo.update).toHaveBeenCalledWith(
        goalId,
        expect.objectContaining({
          updatedAt: fixedNow,
        }),
      );
    });
  });

  describe("Validation", () => {
    it("returns error when goalId is invalid UUID format", async () => {
      const result = await service.updateGoal("invalid-id", {
        description: "Updated",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid goal ID");
      }
    });

    it("returns error when description is empty string", async () => {
      const result = await service.updateGoal(goalId, {
        description: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when description is whitespace only", async () => {
      const result = await service.updateGoal(goalId, {
        description: "   ",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });

  describe("Error Handling", () => {
    it("returns error when goal not found", async () => {
      mockGoalsRepo.findById.mockResolvedValue(null);

      const result = await service.updateGoal(goalId, {
        description: "Updated",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Goal not found");
      }
    });

    it("handles repository errors when fetching goal", async () => {
      mockGoalsRepo.findById.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await service.updateGoal(goalId, {
        description: "Updated",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to update goal");
      }
    });

    it("handles repository errors when updating goal", async () => {
      const existingGoal = makeGoal({ id: goalId, templateId });
      mockGoalsRepo.findById.mockResolvedValue(existingGoal);
      mockGoalsRepo.update.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await service.updateGoal(goalId, {
        description: "Updated",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to update goal");
      }
    });
  });
});

describe("GoalsService - Delete Goal", () => {
  const goalId = "850e8400-e29b-41d4-a716-446655440000";

  let mockGoalsRepo: MockGoalsRepo;
  let mockTemplateRepo: MockTemplateRepo;
  let mockUserProfileRepo: MockUserProfileRepo;
  let service: ReturnType<typeof makeGoalsService>;
  const fixedNow = new Date("2025-01-15T10:30:00Z");

  beforeEach(() => {
    mockGoalsRepo = {
      findByTemplateId: vi.fn(),
      unmarkAllPrimary: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      toggleComplete: vi.fn(),
      deleteById: vi.fn(),
      updateMany: vi.fn(),
    };

    mockTemplateRepo = {
      findByUserId: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      deleteById: vi.fn(),
      updateAcknowledgment: vi.fn(),
    };

    mockUserProfileRepo = {
      getUserProfileIdByUserId: vi.fn(),
    };

    const deps: GoalsServiceDeps = {
      goalsRepo: mockGoalsRepo as GoalsRepo,
      templateRepo: mockTemplateRepo as GoalsTemplateRepo,
      userProfileRepo: mockUserProfileRepo,
      now: () => fixedNow,
    };

    service = makeGoalsService(deps);
  });

  describe("Happy Path", () => {
    it("deletes goal successfully", async () => {
      const deletedGoal = makeGoal({ id: goalId });
      mockGoalsRepo.deleteById.mockResolvedValue(deletedGoal);

      const result = await service.deleteGoal(goalId);

      expect(result.success).toBe(true);
      expect(mockGoalsRepo.deleteById).toHaveBeenCalledWith(goalId);
    });
  });

  describe("Validation", () => {
    it("returns error when goalId is invalid UUID format", async () => {
      const result = await service.deleteGoal("invalid-id");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid goal ID");
      }
    });
  });

  describe("Error Handling", () => {
    it("returns error when goal not found", async () => {
      mockGoalsRepo.deleteById.mockResolvedValue(null);

      const result = await service.deleteGoal(goalId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Goal not found");
      }
    });

    it("handles repository errors when deleting goal", async () => {
      mockGoalsRepo.deleteById.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await service.deleteGoal(goalId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to delete goal");
      }
    });
  });
});

describe("GoalsService - Reorder Goals", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const userProfileId = "650e8400-e29b-41d4-a716-446655440000";
  const templateId = "750e8400-e29b-41d4-a716-446655440000";
  const goal1Id = "850e8400-e29b-41d4-a716-446655440001";
  const goal2Id = "850e8400-e29b-41d4-a716-446655440002";
  const goal3Id = "850e8400-e29b-41d4-a716-446655440003";

  let mockGoalsRepo: MockGoalsRepo;
  let mockTemplateRepo: MockTemplateRepo;
  let mockUserProfileRepo: MockUserProfileRepo;
  let service: ReturnType<typeof makeGoalsService>;
  const fixedNow = new Date("2025-01-15T10:30:00Z");

  beforeEach(() => {
    mockGoalsRepo = {
      findByTemplateId: vi.fn(),
      unmarkAllPrimary: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      toggleComplete: vi.fn(),
      deleteById: vi.fn(),
      updateMany: vi.fn(),
    };

    mockTemplateRepo = {
      findByUserId: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      deleteById: vi.fn(),
      updateAcknowledgment: vi.fn(),
    };

    mockUserProfileRepo = {
      getUserProfileIdByUserId: vi.fn(),
    };

    const deps: GoalsServiceDeps = {
      goalsRepo: mockGoalsRepo as GoalsRepo,
      templateRepo: mockTemplateRepo as GoalsTemplateRepo,
      userProfileRepo: mockUserProfileRepo,
      now: () => fixedNow,
    };

    service = makeGoalsService(deps);
  });

  describe("Happy Path", () => {
    it("reorders goals successfully", async () => {
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(
        userProfileId,
      );
      mockTemplateRepo.findByUserId.mockResolvedValue({
        id: templateId,
        userId: userProfileId,
      } as unknown as GoalsTemplate);

      const existingGoals = [
        makeGoal({ id: goal1Id, templateId, order: 0 }),
        makeGoal({ id: goal2Id, templateId, order: 1 }),
        makeGoal({ id: goal3Id, templateId, order: 2 }),
      ];
      mockGoalsRepo.findByTemplateId.mockResolvedValue(existingGoals);
      mockGoalsRepo.updateMany.mockResolvedValue(undefined);

      const result = await service.reorderGoals(userId, [
        goal3Id,
        goal1Id,
        goal2Id,
      ]);

      expect(result.success).toBe(true);
      expect(mockGoalsRepo.updateMany).toHaveBeenCalledWith([
        { id: goal3Id, data: { order: 0, updatedAt: fixedNow } },
        { id: goal1Id, data: { order: 1, updatedAt: fixedNow } },
        { id: goal2Id, data: { order: 2, updatedAt: fixedNow } },
      ]);
    });

    it("updates order field for all goals", async () => {
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(
        userProfileId,
      );
      mockTemplateRepo.findByUserId.mockResolvedValue({
        id: templateId,
      } as unknown as GoalsTemplate);
      mockGoalsRepo.findByTemplateId.mockResolvedValue([
        makeGoal({ id: goal1Id, templateId }),
        makeGoal({ id: goal2Id, templateId }),
      ]);
      mockGoalsRepo.updateMany.mockResolvedValue(undefined);

      await service.reorderGoals(userId, [goal2Id, goal1Id]);

      expect(mockGoalsRepo.updateMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: goal2Id,
            data: expect.objectContaining({ order: 0 }),
          }),
          expect.objectContaining({
            id: goal1Id,
            data: expect.objectContaining({ order: 1 }),
          }),
        ]),
      );
    });

    it("uses same timestamp for all updates (deterministic)", async () => {
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(
        userProfileId,
      );
      mockTemplateRepo.findByUserId.mockResolvedValue({
        id: templateId,
      } as unknown as GoalsTemplate);
      mockGoalsRepo.findByTemplateId.mockResolvedValue([
        makeGoal({ id: goal1Id, templateId }),
        makeGoal({ id: goal2Id, templateId }),
      ]);
      mockGoalsRepo.updateMany.mockResolvedValue(undefined);

      await service.reorderGoals(userId, [goal1Id, goal2Id]);

      expect(mockGoalsRepo.updateMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({ updatedAt: fixedNow }),
          }),
          expect.objectContaining({
            data: expect.objectContaining({ updatedAt: fixedNow }),
          }),
        ]),
      );
    });
  });

  describe("Validation", () => {
    it("returns error when userId is invalid UUID format", async () => {
      const result = await service.reorderGoals("invalid-id", [goal1Id]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid user ID");
      }
    });

    it("returns error when goalIds array is empty", async () => {
      const result = await service.reorderGoals(userId, []);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when goalIds contains invalid UUID", async () => {
      const result = await service.reorderGoals(userId, ["invalid-id"]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });

  describe("Error Handling", () => {
    it("returns error when template not found", async () => {
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(
        userProfileId,
      );
      mockTemplateRepo.findByUserId.mockResolvedValue(null);

      const result = await service.reorderGoals(userId, [goal1Id]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Goals template not found");
      }
    });

    it("returns error when user not found", async () => {
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(null);

      const result = await service.reorderGoals(userId, [goal1Id]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User not found");
      }
    });

    it("returns error when goal in list doesn't exist", async () => {
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(
        userProfileId,
      );
      mockTemplateRepo.findByUserId.mockResolvedValue({
        id: templateId,
      } as unknown as GoalsTemplate);
      mockGoalsRepo.findByTemplateId.mockResolvedValue([
        makeGoal({ id: goal1Id, templateId }),
      ]);

      const result = await service.reorderGoals(userId, [goal1Id, goal2Id]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid goal IDs");
      }
    });

    it("handles repository errors when updating goals", async () => {
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(
        userProfileId,
      );
      mockTemplateRepo.findByUserId.mockResolvedValue({
        id: templateId,
      } as unknown as GoalsTemplate);
      mockGoalsRepo.findByTemplateId.mockResolvedValue([
        makeGoal({ id: goal1Id, templateId }),
      ]);
      mockGoalsRepo.updateMany.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await service.reorderGoals(userId, [goal1Id]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to reorder goals");
      }
    });
  });
});

describe("GoalsService - Acknowledge Goals", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const userProfileId = "650e8400-e29b-41d4-a716-446655440000";
  const templateId = "750e8400-e29b-41d4-a716-446655440000";

  let mockGoalsRepo: MockGoalsRepo;
  let mockTemplateRepo: MockTemplateRepo;
  let mockUserProfileRepo: MockUserProfileRepo;
  let service: ReturnType<typeof makeGoalsService>;
  const fixedNow = new Date("2025-01-15T10:30:00Z");

  beforeEach(() => {
    mockGoalsRepo = {
      findByTemplateId: vi.fn(),
      unmarkAllPrimary: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      toggleComplete: vi.fn(),
      deleteById: vi.fn(),
      updateMany: vi.fn(),
    };

    mockTemplateRepo = {
      findByUserId: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      deleteById: vi.fn(),
      updateAcknowledgment: vi.fn(),
    };

    mockUserProfileRepo = {
      getUserProfileIdByUserId: vi.fn(),
    };

    const deps: GoalsServiceDeps = {
      goalsRepo: mockGoalsRepo as GoalsRepo,
      templateRepo: mockTemplateRepo as GoalsTemplateRepo,
      userProfileRepo: mockUserProfileRepo,
      now: () => fixedNow,
    };

    service = makeGoalsService(deps);
  });

  describe("Happy Path", () => {
    it("sets goalsAcknowledgedByClient to true successfully", async () => {
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(
        userProfileId,
      );
      mockTemplateRepo.findByUserId.mockResolvedValue({
        id: templateId,
        userId: userProfileId,
      } as unknown as GoalsTemplate);
      mockTemplateRepo.updateAcknowledgment.mockResolvedValue({
        id: templateId,
        goalsAcknowledgedByClient: true,
      } as unknown as GoalsTemplate);

      const result = await service.acknowledgeGoals(userId, true);

      expect(result.success).toBe(true);
      expect(mockTemplateRepo.updateAcknowledgment).toHaveBeenCalledWith(
        templateId,
        true,
        fixedNow,
      );
    });

    it("sets goalsAcknowledgedByClient to false successfully", async () => {
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(
        userProfileId,
      );
      mockTemplateRepo.findByUserId.mockResolvedValue({
        id: templateId,
        userId: userProfileId,
      } as unknown as GoalsTemplate);
      mockTemplateRepo.updateAcknowledgment.mockResolvedValue({
        id: templateId,
        goalsAcknowledgedByClient: false,
      } as unknown as GoalsTemplate);

      const result = await service.acknowledgeGoals(userId, false);

      expect(result.success).toBe(true);
      expect(mockTemplateRepo.updateAcknowledgment).toHaveBeenCalledWith(
        templateId,
        false,
        fixedNow,
      );
    });
  });

  describe("Validation", () => {
    it("returns error when userId is invalid UUID format", async () => {
      const result = await service.acknowledgeGoals("invalid-id", true);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid user ID");
      }
    });
  });

  describe("Error Handling", () => {
    it("returns error when user not found", async () => {
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(null);

      const result = await service.acknowledgeGoals(userId, true);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User not found");
      }
    });

    it("returns error when template not found", async () => {
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(
        userProfileId,
      );
      mockTemplateRepo.findByUserId.mockResolvedValue(null);

      const result = await service.acknowledgeGoals(userId, true);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Goals template not found");
      }
    });

    it("handles repository errors when updating template", async () => {
      mockUserProfileRepo.getUserProfileIdByUserId.mockResolvedValue(
        userProfileId,
      );
      mockTemplateRepo.findByUserId.mockResolvedValue({
        id: templateId,
        userId: userProfileId,
      } as unknown as GoalsTemplate);
      mockTemplateRepo.updateAcknowledgment.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await service.acknowledgeGoals(userId, true);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to acknowledge goals");
      }
    });
  });
});
