import { describe, it, expect, vi } from "vitest";
import {
  getRoutine,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  publishRoutine,
  type RoutineDeps,
  type PublishRoutineDeps,
} from "./actions";
import { makeRoutineRepoFake } from "./routine.repo.fake";

describe("Routine Info Actions - Unit Tests", () => {
  // Test UUIDs
  const user1Id = "550e8400-e29b-41d4-a716-446655440000";
  const user2Id = "550e8400-e29b-41d4-a716-446655440001";
  const routineId = "450e8400-e29b-41d4-a716-446655440000";

  describe("getRoutine", () => {
    it("returns null when user has no routine", async () => {
      const repo = makeRoutineRepoFake();
      const deps: RoutineDeps = {
        repo,
        now: () => new Date("2025-01-15T12:00:00Z"),
      };

      const result = await getRoutine(user1Id, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it("returns routine when user has one", async () => {
      const repo = makeRoutineRepoFake();

      repo._store.set(routineId, {
        id: routineId,
        userProfileId: user1Id,
        name: "My Routine",
        startDate: new Date("2025-01-01"),
        endDate: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const deps: RoutineDeps = {
        repo,
        now: () => new Date("2025-01-15T12:00:00Z"),
      };

      const result = await getRoutine(user1Id, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toBeNull();
        expect(result.data!.name).toBe("My Routine");
        expect(result.data!.userProfileId).toBe(user1Id);
      }
    });

    it("returns error when userId is invalid format", async () => {
      const deps: RoutineDeps = {
        repo: makeRoutineRepoFake(),
        now: () => new Date("2025-01-15T12:00:00Z"),
      };

      const result = await getRoutine("invalid-id", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid user ID");
      }
    });

    it("handles repository errors", async () => {
      const repo = makeRoutineRepoFake();
      repo.findByUserId = async () => {
        throw new Error("Database connection failed");
      };

      const deps: RoutineDeps = {
        repo,
        now: () => new Date("2025-01-15T12:00:00Z"),
      };

      const result = await getRoutine(user1Id, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to fetch routine");
      }
    });
  });

  describe("createRoutine", () => {
    it("creates routine successfully with all required fields", async () => {
      const repo = makeRoutineRepoFake();
      const fixedNow = new Date("2025-01-15T10:30:00Z");

      const deps: RoutineDeps = {
        repo,
        now: () => fixedNow,
      };

      const data = {
        name: "My Skincare Routine",
        startDate: new Date("2025-01-20"),
        endDate: new Date("2025-04-20"),
      };

      const result = await createRoutine(user1Id, data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("My Skincare Routine");
        expect(result.data.startDate).toEqual(new Date("2025-01-20"));
        expect(result.data.endDate).toEqual(new Date("2025-04-20"));
        expect(result.data.userProfileId).toBe(user1Id);
      }
    });

    it("creates routine with optional endDate provided", async () => {
      const repo = makeRoutineRepoFake();

      const deps: RoutineDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const data = {
        name: "Summer Routine",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-08-31"),
      };

      const result = await createRoutine(user1Id, data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.endDate).toEqual(new Date("2025-08-31"));
      }
    });

    it("creates routine without endDate (defaults to null)", async () => {
      const repo = makeRoutineRepoFake();

      const deps: RoutineDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const data = {
        name: "Ongoing Routine",
        startDate: new Date("2025-01-20"),
      };

      const result = await createRoutine(user1Id, data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.endDate).toBeNull();
      }
    });

    it("sets createdAt and updatedAt timestamps using injected now()", async () => {
      const repo = makeRoutineRepoFake();
      const fixedNow = new Date("2025-01-15T10:30:00Z");

      const deps: RoutineDeps = {
        repo,
        now: () => fixedNow,
      };

      const data = {
        name: "Test Routine",
        startDate: new Date("2025-01-20"),
      };

      const result = await createRoutine(user1Id, data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.createdAt).toEqual(fixedNow);
        expect(result.data.updatedAt).toEqual(fixedNow);
      }
    });

    it("returns error when userId is invalid format", async () => {
      const deps: RoutineDeps = {
        repo: makeRoutineRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const data = {
        name: "Test Routine",
        startDate: new Date("2025-01-20"),
      };

      const result = await createRoutine("invalid-id", data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when name is empty string", async () => {
      const deps: RoutineDeps = {
        repo: makeRoutineRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const data = {
        name: "",
        startDate: new Date("2025-01-20"),
      };

      const result = await createRoutine(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when name is whitespace only", async () => {
      const deps: RoutineDeps = {
        repo: makeRoutineRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const data = {
        name: "   ",
        startDate: new Date("2025-01-20"),
      };

      const result = await createRoutine(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when startDate is invalid", async () => {
      const deps: RoutineDeps = {
        repo: makeRoutineRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const data = {
        name: "Test Routine",
        startDate: new Date("invalid-date"),
      };

      const result = await createRoutine(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when user already has a routine", async () => {
      const repo = makeRoutineRepoFake();

      // User already has a routine
      repo._store.set(routineId, {
        id: routineId,
        userProfileId: user1Id,
        name: "Existing Routine",
        startDate: new Date("2025-01-01"),
        endDate: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const deps: RoutineDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const data = {
        name: "New Routine",
        startDate: new Date("2025-01-20"),
      };

      const result = await createRoutine(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User already has a routine");
      }
    });

    it("trims whitespace from name", async () => {
      const repo = makeRoutineRepoFake();

      const deps: RoutineDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const data = {
        name: "  Trimmed Name  ",
        startDate: new Date("2025-01-20"),
      };

      const result = await createRoutine(user1Id, data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Trimmed Name");
      }
    });

    it("converts endDate to null when undefined", async () => {
      const repo = makeRoutineRepoFake();

      const deps: RoutineDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const data = {
        name: "Test Routine",
        startDate: new Date("2025-01-20"),
        endDate: undefined,
      };

      const result = await createRoutine(user1Id, data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.endDate).toBeNull();
      }
    });

    it("handles repository errors", async () => {
      const repo = makeRoutineRepoFake();
      repo.create = async () => {
        throw new Error("Database connection failed");
      };

      const deps: RoutineDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const data = {
        name: "Test Routine",
        startDate: new Date("2025-01-20"),
      };

      const result = await createRoutine(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to create routine");
      }
    });
  });

  describe("updateRoutine", () => {
    it("updates name successfully", async () => {
      const repo = makeRoutineRepoFake();

      repo._store.set(routineId, {
        id: routineId,
        userProfileId: user1Id,
        name: "Old Name",
        startDate: new Date("2025-01-01"),
        endDate: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: RoutineDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await updateRoutine(routineId, { name: "New Name" }, deps);

      expect(result.success).toBe(true);
      expect(repo._store.get(routineId)!.name).toBe("New Name");
    });

    it("updates startDate successfully", async () => {
      const repo = makeRoutineRepoFake();

      repo._store.set(routineId, {
        id: routineId,
        userProfileId: user1Id,
        name: "My Routine",
        startDate: new Date("2025-01-01"),
        endDate: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: RoutineDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await updateRoutine(
        routineId,
        { startDate: new Date("2025-02-01") },
        deps
      );

      expect(result.success).toBe(true);
      expect(repo._store.get(routineId)!.startDate).toEqual(new Date("2025-02-01"));
    });

    it("updates endDate successfully", async () => {
      const repo = makeRoutineRepoFake();

      repo._store.set(routineId, {
        id: routineId,
        userProfileId: user1Id,
        name: "My Routine",
        startDate: new Date("2025-01-01"),
        endDate: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: RoutineDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await updateRoutine(
        routineId,
        { endDate: new Date("2025-06-30") },
        deps
      );

      expect(result.success).toBe(true);
      expect(repo._store.get(routineId)!.endDate).toEqual(new Date("2025-06-30"));
    });

    it("updates endDate to null", async () => {
      const repo = makeRoutineRepoFake();

      repo._store.set(routineId, {
        id: routineId,
        userProfileId: user1Id,
        name: "My Routine",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-06-30"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: RoutineDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await updateRoutine(routineId, { endDate: null }, deps);

      expect(result.success).toBe(true);
      expect(repo._store.get(routineId)!.endDate).toBeNull();
    });

    it("updates multiple fields at once", async () => {
      const repo = makeRoutineRepoFake();

      repo._store.set(routineId, {
        id: routineId,
        userProfileId: user1Id,
        name: "Old Name",
        startDate: new Date("2025-01-01"),
        endDate: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: RoutineDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await updateRoutine(
        routineId,
        {
          name: "Updated Name",
          startDate: new Date("2025-02-01"),
          endDate: new Date("2025-05-31"),
        },
        deps
      );

      expect(result.success).toBe(true);
      const updated = repo._store.get(routineId)!;
      expect(updated.name).toBe("Updated Name");
      expect(updated.startDate).toEqual(new Date("2025-02-01"));
      expect(updated.endDate).toEqual(new Date("2025-05-31"));
    });

    it("updates updatedAt timestamp", async () => {
      const repo = makeRoutineRepoFake();

      repo._store.set(routineId, {
        id: routineId,
        userProfileId: user1Id,
        name: "My Routine",
        startDate: new Date("2025-01-01"),
        endDate: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const fixedNow = new Date("2025-01-15T10:30:00Z");
      const deps: RoutineDeps = {
        repo,
        now: () => fixedNow,
      };

      const result = await updateRoutine(routineId, { name: "Updated" }, deps);

      expect(result.success).toBe(true);
      expect(repo._store.get(routineId)!.updatedAt).toEqual(fixedNow);
    });

    it("returns error when routineId is invalid format", async () => {
      const deps: RoutineDeps = {
        repo: makeRoutineRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await updateRoutine("invalid-id", { name: "Test" }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when routine not found", async () => {
      const deps: RoutineDeps = {
        repo: makeRoutineRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await updateRoutine(
        "550e8400-e29b-41d4-a716-999999999999",
        { name: "Test" },
        deps
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Routine not found");
      }
    });

    it("returns error when updating name to empty string", async () => {
      const repo = makeRoutineRepoFake();

      repo._store.set(routineId, {
        id: routineId,
        userProfileId: user1Id,
        name: "Valid Name",
        startDate: new Date("2025-01-01"),
        endDate: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: RoutineDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await updateRoutine(routineId, { name: "" }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when updating name to whitespace", async () => {
      const repo = makeRoutineRepoFake();

      repo._store.set(routineId, {
        id: routineId,
        userProfileId: user1Id,
        name: "Valid Name",
        startDate: new Date("2025-01-01"),
        endDate: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: RoutineDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await updateRoutine(routineId, { name: "   " }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("handles repository errors", async () => {
      const repo = makeRoutineRepoFake();
      repo.update = async () => {
        throw new Error("Database connection failed");
      };

      const deps: RoutineDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await updateRoutine(routineId, { name: "Updated" }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to update routine");
      }
    });
  });

  describe("deleteRoutine", () => {
    it("deletes routine successfully", async () => {
      const repo = makeRoutineRepoFake();

      repo._store.set(routineId, {
        id: routineId,
        userProfileId: user1Id,
        name: "Routine to delete",
        startDate: new Date("2025-01-01"),
        endDate: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const deps: RoutineDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await deleteRoutine(routineId, deps);

      expect(result.success).toBe(true);
      expect(repo._store.has(routineId)).toBe(false);
    });

    it("returns error when routineId is invalid format", async () => {
      const deps: RoutineDeps = {
        repo: makeRoutineRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await deleteRoutine("invalid-id", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when routine not found", async () => {
      const deps: RoutineDeps = {
        repo: makeRoutineRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await deleteRoutine("550e8400-e29b-41d4-a716-999999999999", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Routine not found");
      }
    });

    it("handles repository errors", async () => {
      const repo = makeRoutineRepoFake();
      repo.deleteById = async () => {
        throw new Error("Database connection failed");
      };

      const deps: RoutineDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await deleteRoutine(routineId, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to delete routine");
      }
    });
  });

  describe("publishRoutine", () => {
    const productId1 = "350e8400-e29b-41d4-a716-446655440000";

    it("publishes routine successfully and generates steps", async () => {
      const routineRepo = makeRoutineRepoFake();
      const generateStepsCalled = vi.fn().mockResolvedValue({ success: true, data: { count: 10 } });

      routineRepo._store.set(routineId, {
        id: routineId,
        userProfileId: user1Id,
        name: "Test Routine",
        startDate: new Date("2025-01-01"),
        endDate: null,
        status: "draft",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const productRepo = {
        findByRoutineId: vi.fn().mockResolvedValue([
          {
            id: productId1,
            routineId,
            userProfileId: user1Id,
            routineStep: "Step 1",
            productName: "Product A",
            instructions: "Apply to face",
            frequency: "Daily",
            timeOfDay: "morning" as const,
          },
        ]),
      };

      const deps: PublishRoutineDeps = {
        routineRepo,
        productRepo,
        generateScheduledSteps: generateStepsCalled,
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await publishRoutine(routineId, deps);

      expect(result.success).toBe(true);
      expect(routineRepo._store.get(routineId)!.status).toBe("published");
      expect(generateStepsCalled).toHaveBeenCalledWith(routineId);
    });

    it("returns error when routineId is invalid format", async () => {
      const deps: PublishRoutineDeps = {
        routineRepo: makeRoutineRepoFake(),
        productRepo: { findByRoutineId: vi.fn() },
        generateScheduledSteps: vi.fn(),
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await publishRoutine("invalid-id", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid routine ID");
      }
    });

    it("returns error when routine not found", async () => {
      const deps: PublishRoutineDeps = {
        routineRepo: makeRoutineRepoFake(),
        productRepo: { findByRoutineId: vi.fn() },
        generateScheduledSteps: vi.fn(),
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await publishRoutine("550e8400-e29b-41d4-a716-999999999999", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Routine not found");
      }
    });

    it("returns error when routine is already published", async () => {
      const routineRepo = makeRoutineRepoFake();

      routineRepo._store.set(routineId, {
        id: routineId,
        userProfileId: user1Id,
        name: "Test Routine",
        startDate: new Date("2025-01-01"),
        endDate: null,
        status: "published",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const deps: PublishRoutineDeps = {
        routineRepo,
        productRepo: { findByRoutineId: vi.fn() },
        generateScheduledSteps: vi.fn(),
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await publishRoutine(routineId, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Routine is already published");
      }
    });

    it("returns error when routine has no products", async () => {
      const routineRepo = makeRoutineRepoFake();

      routineRepo._store.set(routineId, {
        id: routineId,
        userProfileId: user1Id,
        name: "Test Routine",
        startDate: new Date("2025-01-01"),
        endDate: null,
        status: "draft",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const productRepo = {
        findByRoutineId: vi.fn().mockResolvedValue([]),
      };

      const deps: PublishRoutineDeps = {
        routineRepo,
        productRepo,
        generateScheduledSteps: vi.fn(),
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await publishRoutine(routineId, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Cannot publish routine without products");
      }
    });

    it("returns error when generateScheduledSteps fails", async () => {
      const routineRepo = makeRoutineRepoFake();
      const generateStepsCalled = vi.fn().mockResolvedValue({
        success: false,
        error: "Failed to generate steps",
      });

      routineRepo._store.set(routineId, {
        id: routineId,
        userProfileId: user1Id,
        name: "Test Routine",
        startDate: new Date("2025-01-01"),
        endDate: null,
        status: "draft",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const productRepo = {
        findByRoutineId: vi.fn().mockResolvedValue([
          {
            id: productId1,
            routineId,
            userProfileId: user1Id,
            routineStep: "Step 1",
            productName: "Product A",
            instructions: "Apply to face",
            frequency: "Daily",
            timeOfDay: "morning" as const,
          },
        ]),
      };

      const deps: PublishRoutineDeps = {
        routineRepo,
        productRepo,
        generateScheduledSteps: generateStepsCalled,
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await publishRoutine(routineId, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to generate steps");
      }
      // Routine should still be draft since generation failed
      expect(routineRepo._store.get(routineId)!.status).toBe("draft");
    });

    it("handles repository errors gracefully", async () => {
      const routineRepo = makeRoutineRepoFake();
      routineRepo.findById = async () => {
        throw new Error("Database connection failed");
      };

      const deps: PublishRoutineDeps = {
        routineRepo,
        productRepo: { findByRoutineId: vi.fn() },
        generateScheduledSteps: vi.fn(),
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await publishRoutine(routineId, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to publish routine");
      }
    });
  });
});
