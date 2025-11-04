// Service tests for error handling and edge cases
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeStatsService } from "../../stats.service";
import type { StatsRepo } from "../../stats.repo";

describe("StatsService - Error Handling", () => {
  let mockRepo: {
    getUserProfileId: ReturnType<typeof vi.fn>;
    getTodayProgress: ReturnType<typeof vi.fn>;
    getCurrentStreak: ReturnType<typeof vi.fn>;
    getWeeklyCompliance: ReturnType<typeof vi.fn>;
  };

  const fixedNow = new Date("2025-11-07T14:30:00Z");

  beforeEach(() => {
    mockRepo = {
      getUserProfileId: vi.fn(),
      getTodayProgress: vi.fn(),
      getCurrentStreak: vi.fn(),
      getWeeklyCompliance: vi.fn(),
    };
  });

  it("returns error when user not found", async () => {
    mockRepo.getUserProfileId.mockResolvedValue(null);

    const service = makeStatsService({
      repo: mockRepo as unknown as StatsRepo,
      now: () => fixedNow,
    });

    const result = await service.getStats("non-existent-user");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("User not found");
    }

    expect(mockRepo.getTodayProgress).not.toHaveBeenCalled();
    expect(mockRepo.getCurrentStreak).not.toHaveBeenCalled();
    expect(mockRepo.getWeeklyCompliance).not.toHaveBeenCalled();
  });

  it("returns error when getUserProfileId throws", async () => {
    mockRepo.getUserProfileId.mockRejectedValue(
      new Error("Database connection failed"),
    );

    const service = makeStatsService({
      repo: mockRepo as unknown as StatsRepo,
      now: () => fixedNow,
    });

    const result = await service.getStats("auth-user-123");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to fetch user stats");
    }
  });

  it("returns error when getTodayProgress throws", async () => {
    mockRepo.getUserProfileId.mockResolvedValue({
      id: "user-profile-123",
      timezone: "Europe/London",
    });

    mockRepo.getTodayProgress.mockRejectedValue(new Error("Query timeout"));

    const service = makeStatsService({
      repo: mockRepo as unknown as StatsRepo,
      now: () => fixedNow,
    });

    const result = await service.getStats("auth-user-123");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to fetch user stats");
    }
  });

  it("returns error when getCurrentStreak throws", async () => {
    mockRepo.getUserProfileId.mockResolvedValue({
      id: "user-profile-123",
      timezone: "Europe/London",
    });

    mockRepo.getTodayProgress.mockResolvedValue({
      total: 5,
      completed: 3,
    });

    mockRepo.getCurrentStreak.mockRejectedValue(new Error("SQL error"));

    const service = makeStatsService({
      repo: mockRepo as unknown as StatsRepo,
      now: () => fixedNow,
    });

    const result = await service.getStats("auth-user-123");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to fetch user stats");
    }
  });

  it("returns error when getWeeklyCompliance throws", async () => {
    mockRepo.getUserProfileId.mockResolvedValue({
      id: "user-profile-123",
      timezone: "Europe/London",
    });

    mockRepo.getTodayProgress.mockResolvedValue({
      total: 5,
      completed: 3,
    });

    mockRepo.getCurrentStreak.mockResolvedValue(7);

    mockRepo.getWeeklyCompliance.mockRejectedValue(
      new Error("Connection lost"),
    );

    const service = makeStatsService({
      repo: mockRepo as unknown as StatsRepo,
      now: () => fixedNow,
    });

    const result = await service.getStats("auth-user-123");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to fetch user stats");
    }
  });

  it("handles very high streak counts (100+ days)", async () => {
    mockRepo.getUserProfileId.mockResolvedValue({
      id: "user-profile-123",
      timezone: "Europe/London",
    });

    mockRepo.getTodayProgress.mockResolvedValue({
      total: 5,
      completed: 5,
    });

    mockRepo.getCurrentStreak.mockResolvedValue(150);

    mockRepo.getWeeklyCompliance.mockResolvedValue({
      total: 35,
      completed: 35,
    });

    const service = makeStatsService({
      repo: mockRepo as unknown as StatsRepo,
      now: () => fixedNow,
    });

    const result = await service.getStats("auth-user-123");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentStreak.days).toBe(150);
    }
  });
});
