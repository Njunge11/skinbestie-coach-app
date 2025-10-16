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
  describe("getGoals", () => {
    it("returns empty array when user has no goals", async () => {
      const repo = makeGoalsRepoFake();
      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T12:00:00Z"),
        validateId: () => true,
      };

      const result = await getGoals("user_1", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it("returns all goals for a specific user ordered by order field", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set("goal_1", {
        id: "goal_1",
        userProfileId: "user_1",
        name: "Clear skin",
        description: "Reduce acne",
        timeframe: "12 weeks",
        complete: false,
        order: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });
      repo._store.set("goal_2", {
        id: "goal_2",
        userProfileId: "user_1",
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
        now: () => new Date("2025-01-15T12:00:00Z"),
        validateId: () => true,
      };

      const result = await getGoals("user_1", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].name).toBe("Clear skin");
        expect(result.data[1].name).toBe("Even tone");
      }
    });

    it("returns goals in correct ascending order", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set("goal_1", {
        id: "goal_1",
        userProfileId: "user_1",
        name: "Goal A",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repo._store.set("goal_2", {
        id: "goal_2",
        userProfileId: "user_1",
        name: "Goal B",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repo._store.set("goal_3", {
        id: "goal_3",
        userProfileId: "user_1",
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
        now: () => new Date("2025-01-15T12:00:00Z"),
        validateId: () => true,
      };

      const result = await getGoals("user_1", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.map((g) => g.order)).toEqual([0, 1, 2]);
      }
    });

    it("does not return goals belonging to other users", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set("goal_1", {
        id: "goal_1",
        userProfileId: "user_1",
        name: "User 1 Goal",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repo._store.set("goal_2", {
        id: "goal_2",
        userProfileId: "user_2",
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
        now: () => new Date("2025-01-15T12:00:00Z"),
        validateId: () => true,
      };

      const result = await getGoals("user_1", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].userProfileId).toBe("user_1");
      }
    });

    it("returns error when userId is invalid format", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T12:00:00Z"),
        validateId: () => false,
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
        now: () => fixedNow,
        validateId: () => true,
      };

      const data = {
        name: "Clear skin",
        description: "Reduce acne breakouts",
        timeframe: "12 weeks",
      };

      const result = await createGoal("user_1", data, deps);

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
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const data = {
        name: "First goal",
        description: "Description",
        timeframe: "4 weeks",
      };

      const result = await createGoal("user_1", data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe(0);
      }
    });

    it("sets order to max+1 when adding to existing goals", async () => {
      const repo = makeGoalsRepoFake();

      // User has 3 existing goals (order 0, 1, 2)
      repo._store.set("goal_1", {
        id: "goal_1",
        userProfileId: "user_1",
        name: "Goal 1",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repo._store.set("goal_2", {
        id: "goal_2",
        userProfileId: "user_1",
        name: "Goal 2",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repo._store.set("goal_3", {
        id: "goal_3",
        userProfileId: "user_1",
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
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const data = {
        name: "Fourth goal",
        description: "Description",
        timeframe: "6 weeks",
      };

      const result = await createGoal("user_1", data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe(3);
      }
    });

    it("sets complete to false by default", async () => {
      const repo = makeGoalsRepoFake();

      const deps: GoalDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const data = {
        name: "Goal",
        description: "Description",
        timeframe: "4 weeks",
      };

      const result = await createGoal("user_1", data, deps);

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
        now: () => fixedNow,
        validateId: () => true,
      };

      const data = {
        name: "Goal",
        description: "Description",
        timeframe: "4 weeks",
      };

      const result = await createGoal("user_1", data, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.createdAt).toEqual(fixedNow);
        expect(result.data.updatedAt).toEqual(fixedNow);
      }
    });

    it("returns error when userId is invalid format", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => false,
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
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const data = {
        name: "",
        description: "Description",
        timeframe: "4 weeks",
      };

      const result = await createGoal("user_1", data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when name is empty string after trim", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const data = {
        name: "   ",
        description: "Description",
        timeframe: "4 weeks",
      };

      const result = await createGoal("user_1", data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when description is missing", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const data = {
        name: "Goal name",
        description: "",
        timeframe: "4 weeks",
      };

      const result = await createGoal("user_1", data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when description is empty string after trim", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const data = {
        name: "Goal name",
        description: "   ",
        timeframe: "4 weeks",
      };

      const result = await createGoal("user_1", data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when timeframe is missing", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const data = {
        name: "Goal name",
        description: "Description",
        timeframe: "",
      };

      const result = await createGoal("user_1", data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when timeframe is empty string after trim", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const data = {
        name: "Goal name",
        description: "Description",
        timeframe: "   ",
      };

      const result = await createGoal("user_1", data, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });

  describe("updateGoal", () => {
    it("updates goal name successfully", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set("goal_1", {
        id: "goal_1",
        userProfileId: "user_1",
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
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const result = await updateGoal("goal_1", { name: "New name" }, deps);

      expect(result.success).toBe(true);
      expect(repo._store.get("goal_1")!.name).toBe("New name");
    });

    it("updates goal description successfully", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set("goal_2", {
        id: "goal_2",
        userProfileId: "user_1",
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
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const result = await updateGoal("goal_2", { description: "New description" }, deps);

      expect(result.success).toBe(true);
      expect(repo._store.get("goal_2")!.description).toBe("New description");
    });

    it("updates goal timeframe successfully", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set("goal_3", {
        id: "goal_3",
        userProfileId: "user_1",
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
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const result = await updateGoal("goal_3", { timeframe: "8 weeks" }, deps);

      expect(result.success).toBe(true);
      expect(repo._store.get("goal_3")!.timeframe).toBe("8 weeks");
    });

    it("toggles goal complete status", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set("goal_4", {
        id: "goal_4",
        userProfileId: "user_1",
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
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const result = await updateGoal("goal_4", { complete: true }, deps);

      expect(result.success).toBe(true);
      expect(repo._store.get("goal_4")!.complete).toBe(true);
    });

    it("updates multiple fields at once", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set("goal_5", {
        id: "goal_5",
        userProfileId: "user_1",
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
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const result = await updateGoal("goal_5", {
        name: "New name",
        description: "New description",
        timeframe: "8 weeks",
      }, deps);

      expect(result.success).toBe(true);
      const goal = repo._store.get("goal_5")!;
      expect(goal.name).toBe("New name");
      expect(goal.description).toBe("New description");
      expect(goal.timeframe).toBe("8 weeks");
    });

    it("updates updatedAt timestamp", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set("goal_6", {
        id: "goal_6",
        userProfileId: "user_1",
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
        now: () => fixedNow,
        validateId: () => true,
      };

      const result = await updateGoal("goal_6", { name: "Updated" }, deps);

      expect(result.success).toBe(true);
      expect(repo._store.get("goal_6")!.updatedAt).toEqual(fixedNow);
    });

    it("returns error when goalId is invalid format", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => false,
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
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const result = await updateGoal("nonexistent_id", { name: "Test" }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Goal not found");
      }
    });

    it("handles empty updates object", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set("goal_7", {
        id: "goal_7",
        userProfileId: "user_1",
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
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const result = await updateGoal("goal_7", {}, deps);

      expect(result.success).toBe(true);
    });

    it("returns error when updating name to empty string", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set("goal_8", {
        id: "goal_8",
        userProfileId: "user_1",
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
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const result = await updateGoal("goal_8", { name: "" }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when updating name to whitespace", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set("goal_9", {
        id: "goal_9",
        userProfileId: "user_1",
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
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const result = await updateGoal("goal_9", { name: "   " }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when updating description to empty string", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set("goal_10", {
        id: "goal_10",
        userProfileId: "user_1",
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
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const result = await updateGoal("goal_10", { description: "" }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when updating description to whitespace", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set("goal_11", {
        id: "goal_11",
        userProfileId: "user_1",
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
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const result = await updateGoal("goal_11", { description: "   " }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when updating timeframe to empty string", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set("goal_12", {
        id: "goal_12",
        userProfileId: "user_1",
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
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const result = await updateGoal("goal_12", { timeframe: "" }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when updating timeframe to whitespace", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set("goal_13", {
        id: "goal_13",
        userProfileId: "user_1",
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
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const result = await updateGoal("goal_13", { timeframe: "   " }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });

  describe("deleteGoal", () => {
    it("deletes goal successfully", async () => {
      const repo = makeGoalsRepoFake();

      repo._store.set("goal_1", {
        id: "goal_1",
        userProfileId: "user_1",
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
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const result = await deleteGoal("goal_1", deps);

      expect(result.success).toBe(true);
      expect(repo._store.has("goal_1")).toBe(false);
    });

    it("returns error when goalId is invalid format", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => false,
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
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const result = await deleteGoal("nonexistent_id", deps);

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
      repo._store.set("goal_1", {
        id: "goal_1",
        userProfileId: "user_1",
        name: "First",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date("2024-01-01"),
      });
      repo._store.set("goal_2", {
        id: "goal_2",
        userProfileId: "user_1",
        name: "Second",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date("2024-01-01"),
      });
      repo._store.set("goal_3", {
        id: "goal_3",
        userProfileId: "user_1",
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
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      // When: reordering to [goal_3, goal_1, goal_2]
      const result = await reorderGoals(
        "user_1",
        ["goal_3", "goal_1", "goal_2"],
        deps
      );

      // Then: success and order values updated
      expect(result.success).toBe(true);
      expect(repo._store.get("goal_3")!.order).toBe(0);
      expect(repo._store.get("goal_1")!.order).toBe(1);
      expect(repo._store.get("goal_2")!.order).toBe(2);
    });

    it("maintains correct order starting from 0", async () => {
      const repo = makeGoalsRepoFake();

      // Given: two goals with order 0, 1
      repo._store.set("goal_1", {
        id: "goal_1",
        userProfileId: "user_1",
        name: "Goal 1",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repo._store.set("goal_2", {
        id: "goal_2",
        userProfileId: "user_1",
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
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      // When: reversing order to [goal_2, goal_1]
      const result = await reorderGoals("user_1", ["goal_2", "goal_1"], deps);

      // Then: order starts from 0
      expect(result.success).toBe(true);
      expect(repo._store.get("goal_2")!.order).toBe(0);
      expect(repo._store.get("goal_1")!.order).toBe(1);
    });

    it("updates updatedAt for all reordered goals", async () => {
      const repo = makeGoalsRepoFake();

      const oldTimestamp = new Date("2024-01-01");

      // Given: two goals with old timestamps
      repo._store.set("goal_1", {
        id: "goal_1",
        userProfileId: "user_1",
        name: "Goal 1",
        description: "Desc",
        timeframe: "4w",
        complete: false,
        order: 0,
        createdAt: new Date(),
        updatedAt: oldTimestamp,
      });
      repo._store.set("goal_2", {
        id: "goal_2",
        userProfileId: "user_1",
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
        now: () => fixedNow,
        validateId: () => true,
      };

      // When: reordering goals
      const result = await reorderGoals("user_1", ["goal_2", "goal_1"], deps);

      // Then: both goals have updated timestamp
      expect(result.success).toBe(true);
      expect(repo._store.get("goal_1")!.updatedAt).toEqual(fixedNow);
      expect(repo._store.get("goal_2")!.updatedAt).toEqual(fixedNow);
    });

    it("returns error when userId is invalid format", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => false,
      };

      const result = await reorderGoals("invalid-id", ["goal_1"], deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when goalIds array is empty", async () => {
      const deps: GoalDeps = {
        repo: makeGoalsRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const result = await reorderGoals("user_1", [], deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });
});
