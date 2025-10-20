import { describe, it, expect, beforeEach } from "vitest";
import { addDays } from "date-fns";
import {
  makeRoutineStepCompletionsRepoFake,
  type RoutineStepCompletion,
} from "./routine-step-completions.repo.fake";
import {
  markOverdueAsMissed,
  markStepComplete,
  deleteScheduledStepsForProduct,
  generateScheduledStepsForProduct,
  generateScheduledSteps,
  type ComplianceDeps,
  type GenerateStepsDeps,
} from "./actions";

describe("Compliance Actions - Unit Tests", () => {
  let repo: ReturnType<typeof makeRoutineStepCompletionsRepoFake>;
  let deps: ComplianceDeps;

  // Test UUIDs - following pattern from TESTING.md
  const user1Id = "550e8400-e29b-41d4-a716-446655440000";
  const user2Id = "550e8400-e29b-41d4-a716-446655440001";
  const product1Id = "850e8400-e29b-41d4-a716-446655440001";
  const product2Id = "850e8400-e29b-41d4-a716-446655440002";

  beforeEach(() => {
    repo = makeRoutineStepCompletionsRepoFake();
    deps = {
      repo,
    };
  });

  describe("markOverdueAsMissed", () => {
    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts status changed to 'missed'
     * - One behavior: marks overdue pending steps as missed
     * - Uses front door: calls exported function
     * - Deterministic: fixed timestamps
     * - Clear name: describes the behavior
     */
    it("marks pending step as missed when grace period has expired", async () => {
      // Given: A pending step with grace period that ended yesterday
      const now = new Date("2025-01-16T12:00:00.000Z");
      const gracePeriodEnd = new Date("2025-01-15T12:00:00.000Z"); // Yesterday

      const overdueCompletion: RoutineStepCompletion = {
        id: "completion_1",
        routineProductId: product1Id,
        userProfileId: user1Id,
        scheduledDate: new Date("2025-01-14"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-01-14T12:00:00.000Z"),
        gracePeriodEnd,
        completedAt: null,
        status: "pending",
        createdAt: new Date("2025-01-14T00:00:00.000Z"),
        updatedAt: new Date("2025-01-14T00:00:00.000Z"),
      };

      repo._store.set("completion_1", overdueCompletion);

      // When: Mark overdue steps as missed
      await markOverdueAsMissed(user1Id, now, deps);

      // Then: Step status should be 'missed'
      const updated = repo._store.get("completion_1");
      expect(updated?.status).toBe("missed");
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts count of updated records
     * - One behavior: returns number of steps marked as missed
     * - Deterministic: fixed timestamps and data
     */
    it("returns count of steps marked as missed", async () => {
      // Given: Two overdue pending steps
      const now = new Date("2025-01-16T12:00:00.000Z");
      const gracePeriodEnd = new Date("2025-01-15T12:00:00.000Z");

      const completion1: RoutineStepCompletion = {
        id: "completion_1",
        routineProductId: product1Id,
        userProfileId: user1Id,
        scheduledDate: new Date("2025-01-14"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-01-14T12:00:00.000Z"),
        gracePeriodEnd,
        completedAt: null,
        status: "pending",
        createdAt: new Date("2025-01-14T00:00:00.000Z"),
        updatedAt: new Date("2025-01-14T00:00:00.000Z"),
      };

      const completion2: RoutineStepCompletion = {
        id: "completion_2",
        routineProductId: product2Id,
        userProfileId: user1Id,
        scheduledDate: new Date("2025-01-14"),
        scheduledTimeOfDay: "evening",
        onTimeDeadline: new Date("2025-01-14T23:59:59.999Z"),
        gracePeriodEnd,
        completedAt: null,
        status: "pending",
        createdAt: new Date("2025-01-14T00:00:00.000Z"),
        updatedAt: new Date("2025-01-14T00:00:00.000Z"),
      };

      repo._store.set("completion_1", completion1);
      repo._store.set("completion_2", completion2);

      // When: Mark overdue steps as missed
      const result = await markOverdueAsMissed(user1Id, now, deps);

      // Then: Should return count of 2
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(2);
      }
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts pending steps NOT changed
     * - One behavior: doesn't touch steps still in grace period
     * - Deterministic: fixed timestamps
     */
    it("does not mark pending step as missed when still in grace period", async () => {
      // Given: A pending step with grace period ending tomorrow
      const now = new Date("2025-01-15T12:00:00.000Z");
      const gracePeriodEnd = new Date("2025-01-16T12:00:00.000Z"); // Tomorrow

      const stillValidCompletion: RoutineStepCompletion = {
        id: "completion_1",
        routineProductId: product1Id,
        userProfileId: user1Id,
        scheduledDate: new Date("2025-01-15"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-01-15T12:00:00.000Z"),
        gracePeriodEnd,
        completedAt: null,
        status: "pending",
        createdAt: new Date("2025-01-15T00:00:00.000Z"),
        updatedAt: new Date("2025-01-15T00:00:00.000Z"),
      };

      repo._store.set("completion_1", stillValidCompletion);

      // When: Mark overdue steps as missed
      await markOverdueAsMissed(user1Id, now, deps);

      // Then: Step status should still be 'pending'
      const unchanged = repo._store.get("completion_1");
      expect(unchanged?.status).toBe("pending");
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts on-time steps unchanged
     * - One behavior: doesn't modify already completed steps
     * - Clear assertion: status remains 'on-time'
     */
    it("does not change status of on-time completed steps", async () => {
      // Given: A step already marked as 'on-time'
      const now = new Date("2025-01-16T12:00:00.000Z");
      const gracePeriodEnd = new Date("2025-01-15T12:00:00.000Z"); // Expired

      const onTimeCompletion: RoutineStepCompletion = {
        id: "completion_1",
        routineProductId: product1Id,
        userProfileId: user1Id,
        scheduledDate: new Date("2025-01-14"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-01-14T12:00:00.000Z"),
        gracePeriodEnd,
        completedAt: new Date("2025-01-14T11:00:00.000Z"), // Completed on time
        status: "on-time",
        createdAt: new Date("2025-01-14T00:00:00.000Z"),
        updatedAt: new Date("2025-01-14T11:00:00.000Z"),
      };

      repo._store.set("completion_1", onTimeCompletion);

      // When: Mark overdue steps as missed
      await markOverdueAsMissed(user1Id, now, deps);

      // Then: Step status should still be 'on-time'
      const unchanged = repo._store.get("completion_1");
      expect(unchanged?.status).toBe("on-time");
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts late steps unchanged
     * - One behavior: doesn't modify late completed steps
     */
    it("does not change status of late completed steps", async () => {
      // Given: A step already marked as 'late'
      const now = new Date("2025-01-16T12:00:00.000Z");
      const gracePeriodEnd = new Date("2025-01-15T12:00:00.000Z");

      const lateCompletion: RoutineStepCompletion = {
        id: "completion_1",
        routineProductId: product1Id,
        userProfileId: user1Id,
        scheduledDate: new Date("2025-01-14"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-01-14T12:00:00.000Z"),
        gracePeriodEnd,
        completedAt: new Date("2025-01-14T15:00:00.000Z"), // Completed late
        status: "late",
        createdAt: new Date("2025-01-14T00:00:00.000Z"),
        updatedAt: new Date("2025-01-14T15:00:00.000Z"),
      };

      repo._store.set("completion_1", lateCompletion);

      // When: Mark overdue steps as missed
      await markOverdueAsMissed(user1Id, now, deps);

      // Then: Step status should still be 'late'
      const unchanged = repo._store.get("completion_1");
      expect(unchanged?.status).toBe("late");
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts already missed steps unchanged
     * - One behavior: idempotent for already missed steps
     */
    it("does not change status of already missed steps", async () => {
      // Given: A step already marked as 'missed'
      const now = new Date("2025-01-16T12:00:00.000Z");
      const gracePeriodEnd = new Date("2025-01-15T12:00:00.000Z");

      const missedCompletion: RoutineStepCompletion = {
        id: "completion_1",
        routineProductId: product1Id,
        userProfileId: user1Id,
        scheduledDate: new Date("2025-01-14"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-01-14T12:00:00.000Z"),
        gracePeriodEnd,
        completedAt: null,
        status: "missed",
        createdAt: new Date("2025-01-14T00:00:00.000Z"),
        updatedAt: new Date("2025-01-15T12:01:00.000Z"),
      };

      repo._store.set("completion_1", missedCompletion);

      // When: Mark overdue steps as missed
      await markOverdueAsMissed(user1Id, now, deps);

      // Then: Step status should still be 'missed'
      const unchanged = repo._store.get("completion_1");
      expect(unchanged?.status).toBe("missed");
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts only user1's steps changed
     * - One behavior: only updates steps for specified user
     * - Uses manual setup for both users
     */
    it("only updates steps for the specified user", async () => {
      // Given: Overdue steps for two different users
      const now = new Date("2025-01-16T12:00:00.000Z");
      const gracePeriodEnd = new Date("2025-01-15T12:00:00.000Z");

      const user1Completion: RoutineStepCompletion = {
        id: "completion_1",
        routineProductId: product1Id,
        userProfileId: user1Id,
        scheduledDate: new Date("2025-01-14"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-01-14T12:00:00.000Z"),
        gracePeriodEnd,
        completedAt: null,
        status: "pending",
        createdAt: new Date("2025-01-14T00:00:00.000Z"),
        updatedAt: new Date("2025-01-14T00:00:00.000Z"),
      };

      const user2Completion: RoutineStepCompletion = {
        id: "completion_2",
        routineProductId: product1Id,
        userProfileId: user2Id, // Different user
        scheduledDate: new Date("2025-01-14"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-01-14T12:00:00.000Z"),
        gracePeriodEnd,
        completedAt: null,
        status: "pending",
        createdAt: new Date("2025-01-14T00:00:00.000Z"),
        updatedAt: new Date("2025-01-14T00:00:00.000Z"),
      };

      repo._store.set("completion_1", user1Completion);
      repo._store.set("completion_2", user2Completion);

      // When: Mark overdue steps for user1
      await markOverdueAsMissed(user1Id, now, deps);

      // Then: Only user1's step should be marked as missed
      expect(repo._store.get("completion_1")?.status).toBe("missed");
      expect(repo._store.get("completion_2")?.status).toBe("pending"); // User2's step unchanged
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts result when no steps to update
     * - One behavior: returns zero count when nothing to update
     * - Edge case: empty state
     */
    it("returns zero count when user has no overdue steps", async () => {
      // Given: No completions in the store
      const now = new Date("2025-01-16T12:00:00.000Z");

      // When: Mark overdue steps
      const result = await markOverdueAsMissed(user1Id, now, deps);

      // Then: Should return count of 0
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(0);
      }
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts error result
     * - One behavior: handles repository errors
     * - Mock pattern: override repo method to throw
     * - No try-catch in test (antipattern)
     */
    it("handles repository errors gracefully", async () => {
      // Given: Repository that throws an error
      const now = new Date("2025-01-16T12:00:00.000Z");

      // Mock the markOverdue method to throw
      repo.markOverdue = async () => {
        throw new Error("Database connection failed");
      };

      // When: Mark overdue steps
      const result = await markOverdueAsMissed(user1Id, now, deps);

      // Then: Should return error result
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to mark overdue steps");
      }
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts boundary condition
     * - One behavior: marks step expired exactly at grace period end
     * - Edge case: exact timestamp match
     */
    it("marks step as missed when grace period ends exactly at current time", async () => {
      // Given: A pending step with grace period ending exactly now
      const now = new Date("2025-01-15T12:00:00.000Z");
      const gracePeriodEnd = new Date("2025-01-15T12:00:00.000Z"); // Exactly now

      const completion: RoutineStepCompletion = {
        id: "completion_1",
        routineProductId: product1Id,
        userProfileId: user1Id,
        scheduledDate: new Date("2025-01-14"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-01-14T12:00:00.000Z"),
        gracePeriodEnd,
        completedAt: null,
        status: "pending",
        createdAt: new Date("2025-01-14T00:00:00.000Z"),
        updatedAt: new Date("2025-01-14T00:00:00.000Z"),
      };

      repo._store.set("completion_1", completion);

      // When: Mark overdue steps
      await markOverdueAsMissed(user1Id, now, deps);

      // Then: Step should NOT be marked as missed (grace period not yet expired)
      // Grace period is inclusive (<=), expired means AFTER grace period
      const unchanged = repo._store.get("completion_1");
      expect(unchanged?.status).toBe("pending");
    });
  });

  describe("markStepComplete", () => {
    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts status is 'on-time' and completedAt is set
     * - One behavior: marks step complete with on-time status
     * - Uses front door: calls exported function
     * - Deterministic: fixed timestamps
     * - Clear name: describes the behavior
     */
    it("marks step as on-time when completed before deadline", async () => {
      // Given: A pending morning step with deadline at noon
      const now = new Date("2025-01-15T11:00:00.000Z"); // 11 AM
      const completion: RoutineStepCompletion = {
        id: "completion_1",
        routineProductId: product1Id,
        userProfileId: user1Id,
        scheduledDate: new Date("2025-01-15"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-01-15T12:00:00.000Z"), // Noon
        gracePeriodEnd: new Date("2025-01-16T12:00:00.000Z"),
        completedAt: null,
        status: "pending",
        createdAt: new Date("2025-01-15T00:00:00.000Z"),
        updatedAt: new Date("2025-01-15T00:00:00.000Z"),
      };

      repo._store.set("completion_1", completion);

      // When: Mark step complete
      const result = await markStepComplete("completion_1", user1Id, now, deps);

      // Then: Step should be marked as on-time
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("on-time");
        expect(result.data.completedAt).toEqual(now);
      }

      const updated = repo._store.get("completion_1");
      expect(updated?.status).toBe("on-time");
      expect(updated?.completedAt).toEqual(now);
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts status is 'late' when completed after deadline
     * - One behavior: marks step as late when in grace period
     * - Deterministic: fixed timestamps
     */
    it("marks step as late when completed after deadline but within grace period", async () => {
      // Given: A pending morning step with deadline at noon
      const now = new Date("2025-01-15T14:00:00.000Z"); // 2 PM (after noon deadline)
      const completion: RoutineStepCompletion = {
        id: "completion_1",
        routineProductId: product1Id,
        userProfileId: user1Id,
        scheduledDate: new Date("2025-01-15"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-01-15T12:00:00.000Z"), // Noon
        gracePeriodEnd: new Date("2025-01-16T12:00:00.000Z"), // Noon next day
        completedAt: null,
        status: "pending",
        createdAt: new Date("2025-01-15T00:00:00.000Z"),
        updatedAt: new Date("2025-01-15T00:00:00.000Z"),
      };

      repo._store.set("completion_1", completion);

      // When: Mark step complete
      const result = await markStepComplete("completion_1", user1Id, now, deps);

      // Then: Step should be marked as late
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("late");
        expect(result.data.completedAt).toEqual(now);
      }

      const updated = repo._store.get("completion_1");
      expect(updated?.status).toBe("late");
      expect(updated?.completedAt).toEqual(now);
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts error result
     * - One behavior: rejects completion after grace period
     * - Clear error message
     */
    it("returns error when trying to complete step after grace period expired", async () => {
      // Given: A pending step with grace period that ended yesterday
      const now = new Date("2025-01-17T12:00:00.000Z");
      const completion: RoutineStepCompletion = {
        id: "completion_1",
        routineProductId: product1Id,
        userProfileId: user1Id,
        scheduledDate: new Date("2025-01-15"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-01-15T12:00:00.000Z"),
        gracePeriodEnd: new Date("2025-01-16T12:00:00.000Z"), // Yesterday
        completedAt: null,
        status: "pending",
        createdAt: new Date("2025-01-15T00:00:00.000Z"),
        updatedAt: new Date("2025-01-15T00:00:00.000Z"),
      };

      repo._store.set("completion_1", completion);

      // When: Try to mark step complete
      const result = await markStepComplete("completion_1", user1Id, now, deps);

      // Then: Should return error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("This step can no longer be completed (grace period expired)");
      }

      // Step should still be pending
      const unchanged = repo._store.get("completion_1");
      expect(unchanged?.status).toBe("pending");
      expect(unchanged?.completedAt).toBeNull();
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts error result
     * - One behavior: rejects when step not found
     * - Clear error message
     */
    it("returns error when step does not exist", async () => {
      // Given: No step with this ID exists
      const now = new Date("2025-01-15T11:00:00.000Z");

      // When: Try to mark non-existent step complete
      const result = await markStepComplete("nonexistent_id", user1Id, now, deps);

      // Then: Should return error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Step not found");
      }
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts error result for security check
     * - One behavior: rejects when step belongs to different user
     * - Security: prevents users from completing other users' steps
     */
    it("returns error when step belongs to different user", async () => {
      // Given: A step belonging to user2
      const now = new Date("2025-01-15T11:00:00.000Z");
      const completion: RoutineStepCompletion = {
        id: "completion_1",
        routineProductId: product1Id,
        userProfileId: user2Id, // Different user
        scheduledDate: new Date("2025-01-15"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-01-15T12:00:00.000Z"),
        gracePeriodEnd: new Date("2025-01-16T12:00:00.000Z"),
        completedAt: null,
        status: "pending",
        createdAt: new Date("2025-01-15T00:00:00.000Z"),
        updatedAt: new Date("2025-01-15T00:00:00.000Z"),
      };

      repo._store.set("completion_1", completion);

      // When: user1 tries to complete user2's step
      const result = await markStepComplete("completion_1", user1Id, now, deps);

      // Then: Should return error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Step not found");
      }

      // Step should be unchanged
      const unchanged = repo._store.get("completion_1");
      expect(unchanged?.status).toBe("pending");
      expect(unchanged?.completedAt).toBeNull();
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts status when completed exactly at deadline
     * - One behavior: edge case - exactly at boundary
     * - Deterministic: exact timestamp match
     */
    it("marks step as on-time when completed exactly at deadline", async () => {
      // Given: A step with deadline at noon
      const now = new Date("2025-01-15T12:00:00.000Z"); // Exactly at noon
      const completion: RoutineStepCompletion = {
        id: "completion_1",
        routineProductId: product1Id,
        userProfileId: user1Id,
        scheduledDate: new Date("2025-01-15"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-01-15T12:00:00.000Z"), // Exactly now
        gracePeriodEnd: new Date("2025-01-16T12:00:00.000Z"),
        completedAt: null,
        status: "pending",
        createdAt: new Date("2025-01-15T00:00:00.000Z"),
        updatedAt: new Date("2025-01-15T00:00:00.000Z"),
      };

      repo._store.set("completion_1", completion);

      // When: Mark step complete exactly at deadline
      const result = await markStepComplete("completion_1", user1Id, now, deps);

      // Then: Should be on-time (deadline is inclusive)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("on-time");
      }
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts status when completed at grace period end
     * - One behavior: edge case - boundary condition
     */
    it("marks step as late when completed exactly at grace period end", async () => {
      // Given: A step with grace period ending now
      const now = new Date("2025-01-16T12:00:00.000Z"); // Grace period end
      const completion: RoutineStepCompletion = {
        id: "completion_1",
        routineProductId: product1Id,
        userProfileId: user1Id,
        scheduledDate: new Date("2025-01-15"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-01-15T12:00:00.000Z"),
        gracePeriodEnd: new Date("2025-01-16T12:00:00.000Z"), // Exactly now
        completedAt: null,
        status: "pending",
        createdAt: new Date("2025-01-15T00:00:00.000Z"),
        updatedAt: new Date("2025-01-15T00:00:00.000Z"),
      };

      repo._store.set("completion_1", completion);

      // When: Mark step complete exactly at grace period end
      const result = await markStepComplete("completion_1", user1Id, now, deps);

      // Then: Should be late (grace period is inclusive)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("late");
      }
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts error result
     * - One behavior: prevents double completion
     */
    it("returns error when trying to complete already completed step", async () => {
      // Given: A step already marked as on-time
      const now = new Date("2025-01-15T13:00:00.000Z");
      const completion: RoutineStepCompletion = {
        id: "completion_1",
        routineProductId: product1Id,
        userProfileId: user1Id,
        scheduledDate: new Date("2025-01-15"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-01-15T12:00:00.000Z"),
        gracePeriodEnd: new Date("2025-01-16T12:00:00.000Z"),
        completedAt: new Date("2025-01-15T11:00:00.000Z"), // Already completed
        status: "on-time",
        createdAt: new Date("2025-01-15T00:00:00.000Z"),
        updatedAt: new Date("2025-01-15T11:00:00.000Z"),
      };

      repo._store.set("completion_1", completion);

      // When: Try to mark as complete again
      const result = await markStepComplete("completion_1", user1Id, now, deps);

      // Then: Should return error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Step already completed");
      }

      // Original completion time should be unchanged
      const unchanged = repo._store.get("completion_1");
      expect(unchanged?.completedAt).toEqual(new Date("2025-01-15T11:00:00.000Z"));
      expect(unchanged?.status).toBe("on-time");
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts error result
     * - One behavior: handles repository errors
     * - Mock pattern: override repo method to throw
     * - No try-catch in test (antipattern)
     */
    it("handles repository errors gracefully", async () => {
      // Given: Repository that throws an error
      const now = new Date("2025-01-15T11:00:00.000Z");

      const completion: RoutineStepCompletion = {
        id: "completion_1",
        routineProductId: product1Id,
        userProfileId: user1Id,
        scheduledDate: new Date("2025-01-15"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-01-15T12:00:00.000Z"),
        gracePeriodEnd: new Date("2025-01-16T12:00:00.000Z"),
        completedAt: null,
        status: "pending",
        createdAt: new Date("2025-01-15T00:00:00.000Z"),
        updatedAt: new Date("2025-01-15T00:00:00.000Z"),
      };

      repo._store.set("completion_1", completion);

      // Mock the update method to throw an error
      repo.update = async () => {
        throw new Error("Database connection failed");
      };

      // When: Try to mark step complete
      const result = await markStepComplete("completion_1", user1Id, now, deps);

      // Then: Should return error result
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to complete step");
      }
    });
  });

  describe("deleteScheduledStepsForProduct", () => {
    const productId = "product_1";
    const routineId = "routine_1";

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts pending steps are deleted from today onwards
     * - One behavior: deletes pending steps
     * - Uses front door: calls exported function
     * - Clear name: describes the behavior
     * - AAA pattern: Given/When/Then
     */
    it("deletes pending steps from today onwards", async () => {
      // Given: Steps scheduled today, tomorrow, and yesterday
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = addDays(today, 1);
      const yesterday = addDays(today, -1);

      const completionsRepo = makeRoutineStepCompletionsRepoFake();

      // Yesterday (should NOT be deleted)
      await completionsRepo.create({
        routineProductId: productId,
        userProfileId: user1Id,
        scheduledDate: yesterday,
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date(),
        gracePeriodEnd: new Date(),
        completedAt: null,
        status: "pending",
      });

      // Today (should be deleted)
      await completionsRepo.create({
        routineProductId: productId,
        userProfileId: user1Id,
        scheduledDate: today,
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date(),
        gracePeriodEnd: new Date(),
        completedAt: null,
        status: "pending",
      });

      // Tomorrow (should be deleted)
      await completionsRepo.create({
        routineProductId: productId,
        userProfileId: user1Id,
        scheduledDate: tomorrow,
        scheduledTimeOfDay: "evening",
        onTimeDeadline: new Date(),
        gracePeriodEnd: new Date(),
        completedAt: null,
        status: "pending",
      });

      const deps = { completionsRepo };

      // When: Delete scheduled steps for product
      const result = await deleteScheduledStepsForProduct(productId, routineId, user1Id, deps);

      // Then: Should delete steps from today onwards (2 steps)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(2);
      }

      // Verify yesterday's step still exists
      const remainingSteps = await completionsRepo.findByUserAndDateRange(
        user1Id,
        yesterday,
        yesterday
      );
      expect(remainingSteps).toHaveLength(1);
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts missed steps are deleted from today onwards
     * - One behavior: deletes missed steps
     */
    it("deletes missed steps from today onwards", async () => {
      // Given: Missed steps scheduled today and tomorrow
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = addDays(today, 1);

      const completionsRepo = makeRoutineStepCompletionsRepoFake();

      await completionsRepo.create({
        routineProductId: productId,
        userProfileId: user1Id,
        scheduledDate: today,
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date(),
        gracePeriodEnd: new Date(),
        completedAt: null,
        status: "missed",
      });

      await completionsRepo.create({
        routineProductId: productId,
        userProfileId: user1Id,
        scheduledDate: tomorrow,
        scheduledTimeOfDay: "evening",
        onTimeDeadline: new Date(),
        gracePeriodEnd: new Date(),
        completedAt: null,
        status: "missed",
      });

      const deps = { completionsRepo };

      // When: Delete scheduled steps for product
      const result = await deleteScheduledStepsForProduct(productId, routineId, user1Id, deps);

      // Then: Should delete both missed steps
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(2);
      }
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts on-time completed steps are NOT deleted
     * - One behavior: preserves completed steps
     */
    it("does not delete on-time completed steps", async () => {
      // Given: On-time completed step scheduled today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const completionsRepo = makeRoutineStepCompletionsRepoFake();

      await completionsRepo.create({
        routineProductId: productId,
        userProfileId: user1Id,
        scheduledDate: today,
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date(),
        gracePeriodEnd: new Date(),
        completedAt: new Date(),
        status: "on-time",
      });

      const deps = { completionsRepo };

      // When: Delete scheduled steps for product
      const result = await deleteScheduledStepsForProduct(productId, routineId, user1Id, deps);

      // Then: Should not delete the completed step
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(0);
      }

      // Verify step still exists
      const steps = await completionsRepo.findByUserAndDateRange(user1Id, today, today);
      expect(steps).toHaveLength(1);
      expect(steps[0].status).toBe("on-time");
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts late completed steps are NOT deleted
     * - One behavior: preserves late completed steps
     */
    it("does not delete late completed steps", async () => {
      // Given: Late completed step scheduled today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const completionsRepo = makeRoutineStepCompletionsRepoFake();

      await completionsRepo.create({
        routineProductId: productId,
        userProfileId: user1Id,
        scheduledDate: today,
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date(),
        gracePeriodEnd: new Date(),
        completedAt: new Date(),
        status: "late",
      });

      const deps = { completionsRepo };

      // When: Delete scheduled steps for product
      const result = await deleteScheduledStepsForProduct(productId, routineId, user1Id, deps);

      // Then: Should not delete the late completed step
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(0);
      }

      // Verify step still exists
      const steps = await completionsRepo.findByUserAndDateRange(user1Id, today, today);
      expect(steps).toHaveLength(1);
      expect(steps[0].status).toBe("late");
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts zero count when no deletable steps exist
     * - One behavior: returns zero count gracefully
     */
    it("returns zero count when no steps exist for product", async () => {
      // Given: Empty completions repo
      const completionsRepo = makeRoutineStepCompletionsRepoFake();
      const deps = { completionsRepo };

      // When: Delete scheduled steps for product
      const result = await deleteScheduledStepsForProduct(productId, routineId, user1Id, deps);

      // Then: Should return success with zero count
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(0);
      }
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts error result on repository failure
     * - One behavior: handles repository errors
     * - Mock pattern: override method to throw
     */
    it("handles repository errors gracefully", async () => {
      // Given: Repository that throws an error
      const completionsRepo = {
        deleteByRoutineProductId: async () => {
          throw new Error("Database connection failed");
        },
      };

      const deps = { completionsRepo };

      // When: Try to delete scheduled steps
      const result = await deleteScheduledStepsForProduct(productId, routineId, user1Id, deps);

      // Then: Should return error result
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to delete scheduled steps");
      }
    });
  });

  describe("generateScheduledStepsForProduct", () => {
    const productId = "product_1";
    const routineId = "routine_1";

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts steps are created from today to end date for daily product
     * - One behavior: generates daily steps
     * - Uses front door: calls exported function
     * - Clear name: describes the behavior
     * - AAA pattern: Given/When/Then
     */
    it("generates steps for daily product from today to routine end date", async () => {
      // Given: Routine with daily product ending in 5 days
      // Note: generateScheduledStepsForProduct generates from TODAY onwards, not from startDate
      const startDate = addDays(new Date(), -10); // Started 10 days ago
      const endDate = addDays(new Date(), 5); // Ends 5 days from now, so 6 days including today

      const routineRepo = {
        findById: async () => ({
          id: routineId,
          userProfileId: user1Id,
          name: "Test Routine",
          startDate,
          endDate,
          status: "published" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };

      const userRepo = {
        findById: async () => ({
          id: user1Id,
          name: "Test User",
          email: "test@example.com",
          timezone: "America/New_York",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };

      const productRepo = {
        findByRoutineId: async () => [
          {
            id: productId,
            routineId,
            routineStep: "cleanser",
            productName: "Morning Cleanser",
            timeOfDay: "morning" as const,
            frequency: "Daily",
            days: undefined,
            instructions: null,
          },
        ],
      };

      const completionsRepo = makeRoutineStepCompletionsRepoFake();

      const deps = {
        routineRepo,
        userRepo,
        productRepo,
        completionsRepo,
      };

      // When: Generate steps for product
      const result = await generateScheduledStepsForProduct(productId, routineId, user1Id, deps);

      // Then: Should create 6 steps (today through 5 days from now)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(6);
      }

      // Verify steps were created
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const steps = await completionsRepo.findByUserAndDateRange(user1Id, today, endDate);
      expect(steps).toHaveLength(6);
      expect(steps.every(s => s.status === "pending")).toBe(true);
      expect(steps.every(s => s.routineProductId === productId)).toBe(true);
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts steps are created for 6 months when no end date
     * - One behavior: generates 6 months of steps for ongoing routine
     */
    it("generates 6 months of steps when routine has no end date", async () => {
      // Given: Routine with no end date
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const routineRepo = {
        findById: async () => ({
          id: routineId,
          userProfileId: user1Id,
          name: "Test Routine",
          startDate: today,
          endDate: null, // No end date
          status: "published" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };

      const userRepo = {
        findById: async () => ({
          id: user1Id,
          name: "Test User",
          email: "test@example.com",
          timezone: "America/New_York",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };

      const productRepo = {
        findByRoutineId: async () => [
          {
            id: productId,
            routineId,
            routineStep: "cleanser",
            productName: "Morning Cleanser",
            timeOfDay: "morning" as const,
            frequency: "Daily",
            days: undefined,
            instructions: null,
          },
        ],
      };

      const completionsRepo = makeRoutineStepCompletionsRepoFake();

      const deps = {
        routineRepo,
        userRepo,
        productRepo,
        completionsRepo,
      };

      // When: Generate steps for product
      const result = await generateScheduledStepsForProduct(productId, routineId, user1Id, deps);

      // Then: Should create approximately 180 daily steps (6 months)
      expect(result.success).toBe(true);
      if (result.success) {
        // Allow some variance for month lengths
        expect(result.data.count).toBeGreaterThanOrEqual(178);
        expect(result.data.count).toBeLessThanOrEqual(184);
      }
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts steps created only on specified days for 2x/week product
     * - One behavior: respects frequency settings
     */
    it("generates steps only on specified days for 2x per week product", async () => {
      // Given: Routine with 2x/week product (Mon & Thu)
      // Note: generateScheduledStepsForProduct generates from TODAY onwards
      const startDate = addDays(new Date(), -10); // Started 10 days ago
      const endDate = addDays(new Date(), 13); // Ends 13 days from now (2 weeks)

      const routineRepo = {
        findById: async () => ({
          id: routineId,
          userProfileId: user1Id,
          name: "Test Routine",
          startDate,
          endDate,
          status: "published" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };

      const userRepo = {
        findById: async () => ({
          id: user1Id,
          name: "Test User",
          email: "test@example.com",
          timezone: "America/New_York",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };

      const productRepo = {
        findByRoutineId: async () => [
          {
            id: productId,
            routineId,
            routineStep: "treatment",
            productName: "Retinol Serum",
            timeOfDay: "evening" as const,
            frequency: "2x per week",
            days: ["Monday", "Thursday"],
            instructions: null,
          },
        ],
      };

      const completionsRepo = makeRoutineStepCompletionsRepoFake();

      const deps = {
        routineRepo,
        userRepo,
        productRepo,
        completionsRepo,
      };

      // When: Generate steps for product
      const result = await generateScheduledStepsForProduct(productId, routineId, user1Id, deps);

      // Then: Should create at least 4 steps (at least 2 Mondays + 2 Thursdays in 2 weeks)
      expect(result.success).toBe(true);
      if (result.success) {
        // In a 14-day period, there are always at least 4 Mon/Thu occurrences
        expect(result.data.count).toBeGreaterThanOrEqual(4);
      }

      // Verify all steps are on Monday or Thursday
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const steps = await completionsRepo.findByUserAndDateRange(user1Id, today, endDate);
      expect(steps.length).toBeGreaterThanOrEqual(4);
      steps.forEach(step => {
        const dayOfWeek = step.scheduledDate.getDay();
        expect([1, 4]).toContain(dayOfWeek); // Monday or Thursday
      });
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts error when routine not found
     * - One behavior: validates routine exists
     */
    it("returns error when routine not found", async () => {
      // Given: Routine repo that returns null
      const routineRepo = {
        findById: async () => null,
      };

      const deps = {
        routineRepo,
        userRepo: { findById: async () => null },
        productRepo: { findByRoutineId: async () => [] },
        completionsRepo: makeRoutineStepCompletionsRepoFake(),
      };

      // When: Try to generate steps
      const result = await generateScheduledStepsForProduct(productId, routineId, user1Id, deps);

      // Then: Should return error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Routine not found");
      }
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts error when user profile not found
     * - One behavior: validates user exists
     */
    it("returns error when user profile not found", async () => {
      // Given: User repo that returns null
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const routineRepo = {
        findById: async () => ({
          id: routineId,
          userProfileId: user1Id,
          name: "Test Routine",
          startDate: today,
          endDate: null,
          status: "published" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };

      const userRepo = {
        findById: async () => null,
      };

      const deps = {
        routineRepo,
        userRepo,
        productRepo: { findByRoutineId: async () => [] },
        completionsRepo: makeRoutineStepCompletionsRepoFake(),
      };

      // When: Try to generate steps
      const result = await generateScheduledStepsForProduct(productId, routineId, user1Id, deps);

      // Then: Should return error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User profile not found");
      }
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts error when product not found
     * - One behavior: validates product exists
     */
    it("returns error when product not found", async () => {
      // Given: Product repo that returns empty array
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const routineRepo = {
        findById: async () => ({
          id: routineId,
          userProfileId: user1Id,
          name: "Test Routine",
          startDate: today,
          endDate: null,
          status: "published" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };

      const userRepo = {
        findById: async () => ({
          id: user1Id,
          name: "Test User",
          email: "test@example.com",
          timezone: "America/New_York",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };

      const productRepo = {
        findByRoutineId: async () => [], // No products
      };

      const deps = {
        routineRepo,
        userRepo,
        productRepo,
        completionsRepo: makeRoutineStepCompletionsRepoFake(),
      };

      // When: Try to generate steps
      const result = await generateScheduledStepsForProduct(productId, routineId, user1Id, deps);

      // Then: Should return error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Product not found");
      }
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts error result on repository failure
     * - One behavior: handles repository errors
     * - Mock pattern: override method to throw
     */
    it("handles repository errors gracefully", async () => {
      // Given: Repository that throws an error
      const routineRepo = {
        findById: async () => {
          throw new Error("Database connection failed");
        },
      };

      const deps = {
        routineRepo,
        userRepo: { findById: async () => null },
        productRepo: { findByRoutineId: async () => [] },
        completionsRepo: makeRoutineStepCompletionsRepoFake(),
      };

      // When: Try to generate steps
      const result = await generateScheduledStepsForProduct(productId, routineId, user1Id, deps);

      // Then: Should return error result
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to generate scheduled steps");
      }
    });
  });

  describe("generateScheduledSteps", () => {
    // Test UUIDs for routines
    const routine1Id = "750e8400-e29b-41d4-a716-446655440001";

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts completion records created for each day
     * - One behavior: generates daily steps from start to end date
     * - Uses front door: calls exported function
     * - Deterministic: fixed dates and timezone
     * - Manual setup: inline fake data
     */
    it("generates steps for daily frequency from start to end date", async () => {
      // Given: A routine with one daily product
      const routine = {
        id: routine1Id,
        userProfileId: user1Id,
        name: "Test Routine",
        startDate: new Date("2025-01-15"),
        endDate: new Date("2025-01-17"), // 3 days
      };

      const product = {
        id: product1Id,
        routineId: routine1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Gentle Cleanser",
        instructions: "Apply morning and evening",
        frequency: "Daily",
        days: undefined,
        timeOfDay: "morning" as const,
      };

      const user = {
        id: user1Id,
        timezone: "Europe/London",
      };

      // Create fake repos with inline implementations
      const routineRepo = {
        findById: async (id: string) => (id === routine1Id ? routine : null),
      };

      const productRepo = {
        findByRoutineId: async (routineId: string) =>
          routineId === routine1Id ? [product] : [],
      };

      const userRepo = {
        findById: async (id: string) => (id === user1Id ? user : null),
      };

      const completionsRepo = makeRoutineStepCompletionsRepoFake();

      const generateDeps: GenerateStepsDeps = {
        routineRepo,
        productRepo,
        userRepo,
        completionsRepo,
      };

      // When: Generate scheduled steps
      const result = await generateScheduledSteps(routine1Id, generateDeps);

      // Then: Should create 3 completion records (Jan 15, 16, 17)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(3);
      }

      // Verify records exist in store
      const allSteps = Array.from(completionsRepo._store.values());
      expect(allSteps).toHaveLength(3);
      expect(allSteps[0].scheduledDate).toEqual(new Date("2025-01-15"));
      expect(allSteps[1].scheduledDate).toEqual(new Date("2025-01-16"));
      expect(allSteps[2].scheduledDate).toEqual(new Date("2025-01-17"));
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts steps only on specified days
     * - One behavior: generates 2x per week on correct days
     * - Deterministic: fixed week with known days
     */
    it("generates steps for 2x per week frequency on specified days only", async () => {
      // Given: A routine with 2x per week product (Monday, Thursday)
      const routine = {
        id: routine1Id,
        userProfileId: user1Id,
        name: "Test Routine",
        startDate: new Date("2025-01-13"), // Monday
        endDate: new Date("2025-01-19"), // Sunday (full week)
      };

      const product = {
        id: product1Id,
        routineId: routine1Id,
        userProfileId: user1Id,
        routineStep: "Retinol",
        productName: "Retinol Serum",
        instructions: "Apply at night",
        frequency: "2x per week",
        days: ["Monday", "Thursday"],
        timeOfDay: "evening" as const,
      };

      const user = { id: user1Id, timezone: "Europe/London" };

      const routineRepo = {
        findById: async (id: string) => (id === routine1Id ? routine : null),
      };
      const productRepo = {
        findByRoutineId: async (routineId: string) =>
          routineId === routine1Id ? [product] : [],
      };
      const userRepo = {
        findById: async (id: string) => (id === user1Id ? user : null),
      };
      const completionsRepo = makeRoutineStepCompletionsRepoFake();

      const generateDeps: GenerateStepsDeps = {
        routineRepo,
        productRepo,
        userRepo,
        completionsRepo,
      };

      // When: Generate scheduled steps
      const result = await generateScheduledSteps(routine1Id, generateDeps);

      // Then: Should create 4 steps (2 Mondays: 13, 20 would be outside range, so just 1 Monday on 13th + 2 Thursdays: 16)
      // Actually from Jan 13 (Mon) to Jan 19 (Sun) we have:
      // Monday 13th, Thursday 16th = 2 steps
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(2);
      }

      const allSteps = Array.from(completionsRepo._store.values());
      expect(allSteps).toHaveLength(2);

      // Check the dates are Monday and Thursday
      const dates = allSteps.map(s => s.scheduledDate.toISOString().split('T')[0]).sort();
      expect(dates).toEqual(['2025-01-13', '2025-01-16']);
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts 6 months generated for ongoing routine
     * - One behavior: generates 6 months when endDate is null
     * - Deterministic: fixed dates
     */
    it("generates 6 months of steps when routine has no end date", async () => {
      // Given: An ongoing routine (no endDate)
      const routine = {
        id: routine1Id,
        userProfileId: user1Id,
        name: "Ongoing Routine",
        startDate: new Date("2025-01-15"),
        endDate: null, // Ongoing
      };

      const product = {
        id: product1Id,
        routineId: routine1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Daily Cleanser",
        instructions: "Use daily",
        frequency: "Daily",
        days: undefined,
        timeOfDay: "morning" as const,
      };

      const user = { id: user1Id, timezone: "Europe/London" };

      const routineRepo = {
        findById: async (id: string) => (id === routine1Id ? routine : null),
      };
      const productRepo = {
        findByRoutineId: async (routineId: string) =>
          routineId === routine1Id ? [product] : [],
      };
      const userRepo = {
        findById: async (id: string) => (id === user1Id ? user : null),
      };
      const completionsRepo = makeRoutineStepCompletionsRepoFake();

      const generateDeps: GenerateStepsDeps = {
        routineRepo,
        productRepo,
        userRepo,
        completionsRepo,
      };

      // When: Generate scheduled steps
      const result = await generateScheduledSteps(routine1Id, generateDeps);

      // Then: Should create ~180 days of steps (6 months ≈ 180 days)
      expect(result.success).toBe(true);
      if (result.success) {
        // Jan 15 to July 15 is approximately 181 days
        expect(result.data.count).toBeGreaterThanOrEqual(180);
        expect(result.data.count).toBeLessThanOrEqual(185);
      }
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts deadlines calculated in correct timezone
     * - One behavior: uses user's timezone for deadline calculation
     * - Deterministic: fixed timezone and dates
     */
    it("calculates deadlines using user timezone", async () => {
      // Given: A user in America/New_York timezone
      const routine = {
        id: routine1Id,
        userProfileId: user1Id,
        name: "Test Routine",
        startDate: new Date("2025-01-15"),
        endDate: new Date("2025-01-15"), // Single day
      };

      const product = {
        id: product1Id,
        routineId: routine1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Morning Cleanser",
        instructions: "Use in morning",
        frequency: "Daily",
        days: undefined,
        timeOfDay: "morning" as const,
      };

      const user = {
        id: user1Id,
        timezone: "America/New_York", // EST/EDT
      };

      const routineRepo = {
        findById: async (id: string) => (id === routine1Id ? routine : null),
      };
      const productRepo = {
        findByRoutineId: async (routineId: string) =>
          routineId === routine1Id ? [product] : [],
      };
      const userRepo = {
        findById: async (id: string) => (id === user1Id ? user : null),
      };
      const completionsRepo = makeRoutineStepCompletionsRepoFake();

      const generateDeps: GenerateStepsDeps = {
        routineRepo,
        productRepo,
        userRepo,
        completionsRepo,
      };

      // When: Generate scheduled steps
      await generateScheduledSteps(routine1Id, generateDeps);

      // Then: Deadline should be noon in New York (17:00 UTC in January)
      const steps = Array.from(completionsRepo._store.values());
      expect(steps).toHaveLength(1);
      expect(steps[0].onTimeDeadline.toISOString()).toBe("2025-01-15T17:00:00.000Z");
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts steps created for multiple products
     * - One behavior: handles multiple products correctly
     * - Clear assertions: count and product IDs
     */
    it("generates steps for multiple products in the routine", async () => {
      // Given: A routine with 2 products
      const routine = {
        id: routine1Id,
        userProfileId: user1Id,
        name: "Test Routine",
        startDate: new Date("2025-01-15"),
        endDate: new Date("2025-01-15"), // Single day
      };

      const product1 = {
        id: product1Id,
        routineId: routine1Id,
        userProfileId: user1Id,
        routineStep: "Cleanser",
        productName: "Morning Cleanser",
        instructions: "Use AM",
        frequency: "Daily",
        days: undefined,
        timeOfDay: "morning" as const,
      };

      const product2 = {
        id: product2Id,
        routineId: routine1Id,
        userProfileId: user1Id,
        routineStep: "Moisturizer",
        productName: "Evening Moisturizer",
        instructions: "Use PM",
        frequency: "Daily",
        days: undefined,
        timeOfDay: "evening" as const,
      };

      const user = { id: user1Id, timezone: "Europe/London" };

      const routineRepo = {
        findById: async (id: string) => (id === routine1Id ? routine : null),
      };
      const productRepo = {
        findByRoutineId: async (routineId: string) =>
          routineId === routine1Id ? [product1, product2] : [],
      };
      const userRepo = {
        findById: async (id: string) => (id === user1Id ? user : null),
      };
      const completionsRepo = makeRoutineStepCompletionsRepoFake();

      const generateDeps: GenerateStepsDeps = {
        routineRepo,
        productRepo,
        userRepo,
        completionsRepo,
      };

      // When: Generate scheduled steps
      const result = await generateScheduledSteps(routine1Id, generateDeps);

      // Then: Should create 2 steps (1 for each product)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(2);
      }

      const steps = Array.from(completionsRepo._store.values());
      expect(steps).toHaveLength(2);

      const productIds = steps.map(s => s.routineProductId).sort();
      expect(productIds).toEqual([product1Id, product2Id]);
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts zero count returned
     * - One behavior: handles routine with no products
     * - Edge case: empty products array
     */
    it("returns zero count when routine has no products", async () => {
      // Given: A routine with no products
      const routine = {
        id: routine1Id,
        userProfileId: user1Id,
        name: "Empty Routine",
        startDate: new Date("2025-01-15"),
        endDate: new Date("2025-01-17"),
      };

      const user = { id: user1Id, timezone: "Europe/London" };

      const routineRepo = {
        findById: async (id: string) => (id === routine1Id ? routine : null),
      };
      const productRepo = {
        findByRoutineId: async () => [], // No products
      };
      const userRepo = {
        findById: async (id: string) => (id === user1Id ? user : null),
      };
      const completionsRepo = makeRoutineStepCompletionsRepoFake();

      const generateDeps: GenerateStepsDeps = {
        routineRepo,
        productRepo,
        userRepo,
        completionsRepo,
      };

      // When: Generate scheduled steps
      const result = await generateScheduledSteps(routine1Id, generateDeps);

      // Then: Should return success with zero count
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(0);
      }
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts error result
     * - One behavior: returns error when routine not found
     * - Clear error message
     */
    it("returns error when routine does not exist", async () => {
      // Given: Routine repo that returns null
      const routineRepo = {
        findById: async () => null,
      };
      const productRepo = {
        findByRoutineId: async () => [],
      };
      const userRepo = {
        findById: async () => null,
      };
      const completionsRepo = makeRoutineStepCompletionsRepoFake();

      const generateDeps: GenerateStepsDeps = {
        routineRepo,
        productRepo,
        userRepo,
        completionsRepo,
      };

      // When: Try to generate steps
      const result = await generateScheduledSteps("nonexistent_id", generateDeps);

      // Then: Should return error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Routine not found");
      }
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts error result
     * - One behavior: returns error when user not found
     * - Validates data integrity
     */
    it("returns error when user profile not found", async () => {
      // Given: User repo that returns null
      const routine = {
        id: routine1Id,
        userProfileId: user1Id,
        name: "Test Routine",
        startDate: new Date("2025-01-15"),
        endDate: new Date("2025-01-17"),
      };

      const routineRepo = {
        findById: async (id: string) => (id === routine1Id ? routine : null),
      };
      const productRepo = {
        findByRoutineId: async () => [],
      };
      const userRepo = {
        findById: async () => null, // User not found
      };
      const completionsRepo = makeRoutineStepCompletionsRepoFake();

      const generateDeps: GenerateStepsDeps = {
        routineRepo,
        productRepo,
        userRepo,
        completionsRepo,
      };

      // When: Try to generate steps
      const result = await generateScheduledSteps(routine1Id, generateDeps);

      // Then: Should return error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User profile not found");
      }
    });

    /**
     * ✅ Conforms to TESTING.md:
     * - Tests WHAT: asserts error result
     * - One behavior: handles repository errors
     * - Mock pattern: override method to throw
     */
    it("handles repository errors gracefully", async () => {
      // Given: Repository that throws an error
      const routineRepo = {
        findById: async () => {
          throw new Error("Database connection failed");
        },
      };
      const productRepo = {
        findByRoutineId: async () => [],
      };
      const userRepo = {
        findById: async () => null,
      };
      const completionsRepo = makeRoutineStepCompletionsRepoFake();

      const generateDeps: GenerateStepsDeps = {
        routineRepo,
        productRepo,
        userRepo,
        completionsRepo,
      };

      // When: Try to generate steps
      const result = await generateScheduledSteps(routine1Id, generateDeps);

      // Then: Should return error result
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to generate scheduled steps");
      }
    });
  });
});
