import { describe, it, expect } from "vitest";
import {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  reorderGoals,
  type GoalDeps,
} from "./actions";
import { makeGoalsRepoFake } from "./goals.repo.fake";

describe("Goal Actions - Unit Tests", () => {
  // Test UUIDs
  const user1Id = "550e8400-e29b-41d4-a716-446655440000";
  const user2Id = "550e8400-e29b-41d4-a716-446655440001";
  const goal1Id = "650e8400-e29b-41d4-a716-446655440001";
  const goal2Id = "650e8400-e29b-41d4-a716-446655440002";
  const goal3Id = "650e8400-e29b-41d4-a716-446655440003";
  const goal4Id = "650e8400-e29b-41d4-a716-446655440004";
  const goal5Id = "650e8400-e29b-41d4-a716-446655440005";
  const goal6Id = "650e8400-e29b-41d4-a716-446655440006";
  const goal7Id = "650e8400-e29b-41d4-a716-446655440007";
  const goal8Id = "650e8400-e29b-41d4-a716-446655440008";
  const goal9Id = "650e8400-e29b-41d4-a716-446655440009";
  const goal10Id = "650e8400-e29b-41d4-a716-446655440010";
  const goal11Id = "650e8400-e29b-41d4-a716-446655440011";
  const goal12Id = "650e8400-e29b-41d4-a716-446655440012";
  const goal13Id = "650e8400-e29b-41d4-a716-446655440013";

  describe("getGoals", () => {
    it("returns empty array when user has no goals", async () => {
      const repo = makeGoalsRepoFake();
      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T12:00:00Z")
      };

      const result = await getGoals(user1Id, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it("returns all goals for a specific user ordered by order field", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set(goal1Id, {
        id: goal1Id,
        userProfileId: user1Id,
        name: "Clear skin",
        description: "Reduce acne",
        timeframe: "12 weeks",
        complete: false,
        order: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });
      repo._store.set(goal2Id, {
        id: goal2Id,
        userProfileId: user1Id,
        name: "Even tone",
        description: "Fade dark spots",
        timeframe: "8 weeks",
        complete: false,
        order: 1,
        createdAt: new Date("2025-01-02"),
        updatedAt: new Date("2025-01-02"),
      });

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T12:00:00Z")
        
      };

      const result = await getGoals(user1Id, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].name).toBe("Clear skin");
        expect(result.data[1].name).toBe("Even tone");
      }
    });

    it("returns goals in correct ascending order", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set(goal1Id, {
        id: goal1Id,
        userProfileId: user1Id,
        name: "Goal A",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repo._store.set(goal2Id, {
        id: goal2Id,
        userProfileId: user1Id,
        name: "Goal B",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repo._store.set(goal3Id, {
        id: goal3Id,
        userProfileId: user1Id,
        name: "Goal C",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T12:00:00Z")
        
      };

      const result = await getGoals(user1Id, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.map((g) => g.order)).toEqual([0, 1, 2]);
      }
    });

    it("does not return goals belonging to other users", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set(goal1Id, {
        id: goal1Id,
        userProfileId: user1Id,
        name: "User 1 Goal",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repo._store.set(goal2Id, {
        id: goal2Id,
        userProfileId: user2Id,
        name: "User 2 Goal",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T12:00:00Z")
        
      };

      const result = await getGoals(user1Id, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].userProfileId).toBe(user1Id);
      }
    });

    it("returns error when userId is invalid format", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T12:00:00Z")
        
      };

      const result = await getGoals("invalid-id", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid user ID");
      }
    });
  });

  describe("createGoal", () => {
    it("creates goal successfully with all required fields", async () => {
      const repo = makeGoalsRepoFake();
      const fixedNow = new Date("2025-01-15T10:30:00Z");

      const deps: GoalDeps = {
        repo,
        now: () => fixedNow
        
      };

      const data = {
        name: "Clear skin",
        description: "Reduce acne breakouts",
        timeframe: "12 weeks",
      };

      const result = await createGoal(user1Id, data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Clear skin");
        expect(result.data.description).toBe("Reduce acne breakouts");
        expect(result.data.timeframe).toBe("12 weeks");
      }
    });

    it("sets order to 0 when it's the first goal for user", async () => {
      const repo = makeGoalsRepoFake();

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        name: "First goal",
        description: "Description",
        timeframe: "4 weeks",
      };

      const result = await createGoal(user1Id, data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe(0);
      }
    });

    it("sets order to max+1 when adding to existing goals", async () => {
      const repo = makeGoalsRepoFake();

      // User has 3 existing goals (order 0, 1, 2)
      repo._store.set(goal1Id, {
        id: goal1Id,
        userProfileId: user1Id,
        name: "Goal 1",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repo._store.set(goal2Id, {
        id: goal2Id,
        userProfileId: user1Id,
        name: "Goal 2",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repo._store.set(goal3Id, {
        id: goal3Id,
        userProfileId: user1Id,
        name: "Goal 3",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        name: "Fourth goal",
        description: "Description",
        timeframe: "6 weeks",
      };

      const result = await createGoal(user1Id, data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe(3);
      }
    });

    it("sets complete to false by default", async () => {
      const repo = makeGoalsRepoFake();

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        name: "Goal",
        description: "Description",
        timeframe: "4 weeks",
      };

      const result = await createGoal(user1Id, data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.complete).toBe(false);
      }
    });

    it("sets createdAt and updatedAt timestamps using injected now()", async () => {
      const repo = makeGoalsRepoFake();
      const fixedNow = new Date("2025-01-15T10:30:00Z");

      const deps: GoalDeps = {
        repo,
        now: () => fixedNow
        
      };

      const data = {
        name: "Goal",
        description: "Description",
        timeframe: "4 weeks",
      };

      const result = await createGoal(user1Id, data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.createdAt).toEqual(fixedNow);
        expect(result.data.updatedAt).toEqual(fixedNow);
      }
    });

    it("returns error when userId is invalid format", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        name: "Goal",
        description: "Description",
        timeframe: "4 weeks",
      };

      const result = await createGoal("invalid-id", data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when name is missing", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        name: "",
        description: "Description",
        timeframe: "4 weeks",
      };

      const result = await createGoal(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when name is empty string after trim", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        name: "   ",
        description: "Description",
        timeframe: "4 weeks",
      };

      const result = await createGoal(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when description is missing", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        name: "Goal name",
        description: "",
        timeframe: "4 weeks",
      };

      const result = await createGoal(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when description is empty string after trim", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        name: "Goal name",
        description: "   ",
        timeframe: "4 weeks",
      };

      const result = await createGoal(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when timeframe is missing", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        name: "Goal name",
        description: "Description",
        timeframe: "",
      };

      const result = await createGoal(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when timeframe is empty string after trim", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const data = {
        name: "Goal name",
        description: "Description",
        timeframe: "   ",
      };

      const result = await createGoal(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });

  describe("updateGoal", () => {
    it("updates goal name successfully", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set(goal1Id, {
        id: goal1Id,
        userProfileId: user1Id,
        name: "Old name",
        description: "Description",
        timeframe: "4 weeks",
        complete: false,
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateGoal(goal1Id, { name: "New name" }, deps);

      expect(result.success).toBe(true);
      expect(repo._store.get(goal1Id)!.name).toBe("New name");
    });

    it("updates goal description successfully", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set(goal2Id, {
        id: goal2Id,
        userProfileId: user1Id,
        name: "Goal",
        description: "Old description",
        timeframe: "4 weeks",
        complete: false,
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateGoal(goal2Id, { description: "New description" }, deps);

      expect(result.success).toBe(true);
      expect(repo._store.get(goal2Id)!.description).toBe("New description");
    });

    it("updates goal timeframe successfully", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set(goal3Id, {
        id: goal3Id,
        userProfileId: user1Id,
        name: "Goal",
        description: "Description",
        timeframe: "4 weeks",
        complete: false,
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateGoal(goal3Id, { timeframe: "8 weeks" }, deps);

      expect(result.success).toBe(true);
      expect(repo._store.get(goal3Id)!.timeframe).toBe("8 weeks");
    });

    it("toggles goal complete status", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set(goal4Id, {
        id: goal4Id,
        userProfileId: user1Id,
        name: "Goal",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateGoal(goal4Id, { complete: true }, deps);

      expect(result.success).toBe(true);
      expect(repo._store.get(goal4Id)!.complete).toBe(true);
    });

    it("updates multiple fields at once", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set(goal5Id, {
        id: goal5Id,
        userProfileId: user1Id,
        name: "Old name",
        description: "Old description",
        timeframe: "4 weeks",
        complete: false,
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateGoal(goal5Id, {
        name: "New name",
        description: "New description",
        timeframe: "8 weeks",
      }, deps);

      expect(result.success).toBe(true);
      const goal = repo._store.get(goal5Id)!;
      expect(goal.name).toBe("New name");
      expect(goal.description).toBe("New description");
      expect(goal.timeframe).toBe("8 weeks");
    });

    it("updates updatedAt timestamp", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set(goal6Id, {
        id: goal6Id,
        userProfileId: user1Id,
        name: "Goal",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const fixedNow = new Date("2025-01-15T10:30:00Z");
      const deps: GoalDeps = {
        repo,
        now: () => fixedNow
        
      };

      const result = await updateGoal(goal6Id, { name: "Updated" }, deps);

      expect(result.success).toBe(true);
      expect(repo._store.get(goal6Id)!.updatedAt).toEqual(fixedNow);
    });

    it("returns error when goalId is invalid format", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateGoal("invalid-id", { name: "Test" }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when goal not found", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateGoal("550e8400-e29b-41d4-a716-999999999999", { name: "Test" }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Goal not found");
      }
    });

    it("handles empty updates object", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set(goal7Id, {
        id: goal7Id,
        userProfileId: user1Id,
        name: "Goal",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateGoal(goal7Id, {}, deps);

      expect(result.success).toBe(true);
    });

    it("returns error when updating name to empty string", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set(goal8Id, {
        id: goal8Id,
        userProfileId: user1Id,
        name: "Valid name",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateGoal(goal8Id, { name: "" }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when updating name to whitespace", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set(goal9Id, {
        id: goal9Id,
        userProfileId: user1Id,
        name: "Valid name",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateGoal(goal9Id, { name: "   " }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when updating description to empty string", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set(goal10Id, {
        id: goal10Id,
        userProfileId: user1Id,
        name: "Goal",
        description: "Valid description",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateGoal(goal10Id, { description: "" }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when updating description to whitespace", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set(goal11Id, {
        id: goal11Id,
        userProfileId: user1Id,
        name: "Goal",
        description: "Valid description",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateGoal(goal11Id, { description: "   " }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when updating timeframe to empty string", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set(goal12Id, {
        id: goal12Id,
        userProfileId: user1Id,
        name: "Goal",
        description: "Desc",
        timeframe: "Valid timeframe",
        complete: false,
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateGoal(goal12Id, { timeframe: "" }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when updating timeframe to whitespace", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set(goal13Id, {
        id: goal13Id,
        userProfileId: user1Id,
        name: "Goal",
        description: "Desc",
        timeframe: "Valid timeframe",
        complete: false,
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await updateGoal(goal13Id, { timeframe: "   " }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });

  describe("deleteGoal", () => {
    it("deletes goal successfully", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set(goal1Id, {
        id: goal1Id,
        userProfileId: user1Id,
        name: "Goal to delete",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await deleteGoal(goal1Id, deps);

      expect(result.success).toBe(true);
      expect(repo._store.has(goal1Id)).toBe(false);
    });

    it("returns error when goalId is invalid format", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await deleteGoal("invalid-id", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when goal not found", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await deleteGoal("550e8400-e29b-41d4-a716-999999999999", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Goal not found");
      }
    });
  });

  describe("reorderGoals", () => {
    it("updates order values for all goals in new sequence", async () => {
      const repo = makeGoalsRepoFake();

      // Given: three goals with initial order 0, 1, 2
      repo._store.set(goal1Id, {
        id: goal1Id,
        userProfileId: user1Id,
        name: "First",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date("2024-01-01"),
      });
      repo._store.set(goal2Id, {
        id: goal2Id,
        userProfileId: user1Id,
        name: "Second",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date("2024-01-01"),
      });
      repo._store.set(goal3Id, {
        id: goal3Id,
        userProfileId: user1Id,
        name: "Third",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 2,
        createdAt: new Date(),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      // When: reordering to [goal_3, goal_1, goal_2]
      const result = await reorderGoals(
        user1Id,
        [goal3Id, goal1Id, goal2Id],
        deps
      );

      // Then: success and order values updated
      expect(result.success).toBe(true);
      expect(repo._store.get(goal3Id)!.order).toBe(0);
      expect(repo._store.get(goal1Id)!.order).toBe(1);
      expect(repo._store.get(goal2Id)!.order).toBe(2);
    });

    it("maintains correct order starting from 0", async () => {
      const repo = makeGoalsRepoFake();

      // Given: two goals with order 0, 1
      repo._store.set(goal1Id, {
        id: goal1Id,
        userProfileId: user1Id,
        name: "Goal 1",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repo._store.set(goal2Id, {
        id: goal2Id,
        userProfileId: user1Id,
        name: "Goal 2",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      // When: reversing order to [goal_2, goal_1]
      const result = await reorderGoals(user1Id, [goal2Id, goal1Id], deps);

      // Then: order starts from 0
      expect(result.success).toBe(true);
      expect(repo._store.get(goal2Id)!.order).toBe(0);
      expect(repo._store.get(goal1Id)!.order).toBe(1);
    });

    it("updates updatedAt for all reordered goals", async () => {
      const repo = makeGoalsRepoFake();

      const oldTimestamp = new Date("2024-01-01");

      // Given: two goals with old timestamps
      repo._store.set(goal1Id, {
        id: goal1Id,
        userProfileId: user1Id,
        name: "Goal 1",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date(),
        updatedAt: oldTimestamp,
      });
      repo._store.set(goal2Id, {
        id: goal2Id,
        userProfileId: user1Id,
        name: "Goal 2",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 1,
        createdAt: new Date(),
        updatedAt: oldTimestamp,
      });

      const fixedNow = new Date("2025-01-15T10:30:00Z");
      const deps: GoalDeps = {
        repo,
        now: () => fixedNow
        
      };

      // When: reordering goals
      const result = await reorderGoals(user1Id, [goal2Id, goal1Id], deps);

      // Then: both goals have updated timestamp
      expect(result.success).toBe(true);
      expect(repo._store.get(goal1Id)!.updatedAt).toEqual(fixedNow);
      expect(repo._store.get(goal2Id)!.updatedAt).toEqual(fixedNow);
    });

    it("returns error when userId is invalid format", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await reorderGoals("invalid-id", [goal1Id], deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when goalIds array is empty", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z")
        
      };

      const result = await reorderGoals(user1Id, [], deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });

  describe("Error Handling", () => {
    it("createGoal handles repository errors", async () => {
      const repo = makeGoalsRepoFake();
      repo.create = async () => {
        throw new Error("Database connection failed");
      };

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
      };

      const data = {
        name: "Test goal",
        description: "Test description",
        timeframe: "4 weeks",
      };

      const result = await createGoal(user1Id, data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to create goal");
      }
    });

    it("getGoals handles repository errors", async () => {
      const repo = makeGoalsRepoFake();
      repo.findByUserId = async () => {
        throw new Error("Database connection failed");
      };

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
      };

      const result = await getGoals(user1Id, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to fetch goals");
      }
    });

    it("updateGoal handles repository errors", async () => {
      const repo = makeGoalsRepoFake();
      repo.update = async () => {
        throw new Error("Database connection failed");
      };

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
      };

      const result = await updateGoal(goal1Id, { name: "Updated" }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to update goal");
      }
    });

    it("deleteGoal handles repository errors", async () => {
      const repo = makeGoalsRepoFake();
      repo.deleteById = async () => {
        throw new Error("Database connection failed");
      };

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
      };

      const result = await deleteGoal(goal1Id, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to delete goal");
      }
    });

    it("reorderGoals handles repository errors", async () => {
      const repo = makeGoalsRepoFake();
      repo.updateMany = async () => {
        throw new Error("Database connection failed");
      };

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z")
      };

      const result = await reorderGoals(user1Id, [goal1Id, goal2Id], deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to reorder goals");
      }
    });
  });
});
