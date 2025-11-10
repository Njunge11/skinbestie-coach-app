// Service layer unit tests for catchup steps functionality
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDashboardService } from "../../dashboard.service";
import type { DashboardRepo } from "../../dashboard.repo";

describe("DashboardService - getCatchupSteps", () => {
  let mockRepo: {
    getUserDashboardData: ReturnType<typeof vi.fn>;
    getPublishedGoals: ReturnType<typeof vi.fn>;
    getTodayRoutineSteps: ReturnType<typeof vi.fn>;
    getCatchupSteps: ReturnType<typeof vi.fn>;
    getRoutine: ReturnType<typeof vi.fn>;
  };
  let service: ReturnType<typeof makeDashboardService>;

  const fixedNow = new Date("2025-11-04T10:00:00Z");
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    mockRepo = {
      getUserDashboardData: vi.fn(),
      getPublishedGoals: vi.fn(),
      getTodayRoutineSteps: vi.fn(),
      getCatchupSteps: vi.fn(),
      getRoutine: vi.fn(),
    };

    service = makeDashboardService({
      repo: mockRepo as unknown as DashboardRepo,
      now: () => fixedNow,
    });

    // Default: valid user exists
    mockRepo.getUserDashboardData.mockResolvedValue({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      nickname: null,
      skinType: null,
      hasCompletedSkinTest: true,
      goalsTemplateStatus: "published",
      routineStatus: "published",
      hasCompletedBooking: true,
      goalsAcknowledgedByClient: false,
    });

    mockRepo.getPublishedGoals.mockResolvedValue([]);
    mockRepo.getTodayRoutineSteps.mockResolvedValue([]);
    mockRepo.getCatchupSteps.mockResolvedValue([]);
    mockRepo.getRoutine.mockResolvedValue(null);
  });

  it("includes catchup steps in dashboard response when steps exist", async () => {
    const mockCatchupSteps = [
      {
        id: "step-1",
        routineStep: "Cleanse",
        productName: "Morning Cleanser",
        productUrl: null,
        instructions: "Apply to face",
        timeOfDay: "morning" as const,
        order: 1,
        status: "pending" as const,
        completedAt: null,
        scheduledDate: new Date("2025-11-03"),
        gracePeriodEnd: new Date("2025-11-04T12:00:00Z"),
      },
    ];

    mockRepo.getCatchupSteps.mockResolvedValue(mockCatchupSteps);

    const result = await service.getConsumerDashboard(userId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.catchupSteps).toEqual(mockCatchupSteps);
      expect(result.data.catchupSteps).toHaveLength(1);
    }
  });

  it("includes empty catchup steps array when no steps available", async () => {
    mockRepo.getCatchupSteps.mockResolvedValue([]);

    const result = await service.getConsumerDashboard(userId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.catchupSteps).toEqual([]);
    }
  });

  it("calls getCatchupSteps with current time", async () => {
    await service.getConsumerDashboard(userId);

    expect(mockRepo.getCatchupSteps).toHaveBeenCalledWith(userId, fixedNow);
  });

  it("returns catchup steps as null when routine is not published", async () => {
    mockRepo.getUserDashboardData.mockResolvedValue({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      nickname: null,
      skinType: null,
      hasCompletedSkinTest: true,
      goalsTemplateStatus: "published",
      routineStatus: "draft", // Not published
      hasCompletedBooking: true,
      goalsAcknowledgedByClient: false,
    });

    const result = await service.getConsumerDashboard(userId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.catchupSteps).toBeNull();
      // Should not even call getCatchupSteps if routine is not published
      expect(mockRepo.getCatchupSteps).not.toHaveBeenCalled();
    }
  });

  it("handles repository error gracefully", async () => {
    mockRepo.getCatchupSteps.mockRejectedValue(
      new Error("Database connection failed"),
    );

    const result = await service.getConsumerDashboard(userId);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to retrieve dashboard data");
    }
  });

  it("fetches catchup steps in parallel with other data", async () => {
    const mockGoals = [{ id: "goal-1", description: "Clear skin" }];
    const mockTodayRoutine = [
      { id: "step-1", productName: "Cleanse", status: "pending" },
    ];
    const mockCatchupSteps = [
      { id: "step-2", productName: "Moisturise", status: "pending" },
    ];

    mockRepo.getPublishedGoals.mockResolvedValue(mockGoals);
    mockRepo.getTodayRoutineSteps.mockResolvedValue(mockTodayRoutine);
    mockRepo.getCatchupSteps.mockResolvedValue(mockCatchupSteps);

    await service.getConsumerDashboard(userId);

    // Verify all were called (parallel execution)
    expect(mockRepo.getPublishedGoals).toHaveBeenCalled();
    expect(mockRepo.getTodayRoutineSteps).toHaveBeenCalled();
    expect(mockRepo.getCatchupSteps).toHaveBeenCalled();
  });
});
