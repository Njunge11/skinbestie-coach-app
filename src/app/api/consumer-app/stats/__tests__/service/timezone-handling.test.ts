// Service tests for timezone and date handling
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeStatsService } from "../../stats.service";
import type { StatsRepo } from "../../stats.repo";

describe("StatsService - Timezone Handling", () => {
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

  it("calls repo methods with correct date parameters in user timezone", async () => {
    mockRepo.getUserProfileId.mockResolvedValue({
      id: "user-profile-123",
      timezone: "America/New_York",
    });

    mockRepo.getTodayProgress.mockResolvedValue({
      total: 0,
      completed: 0,
    });
    mockRepo.getCurrentStreak.mockResolvedValue(0);
    mockRepo.getWeeklyCompliance.mockResolvedValue({
      total: 0,
      completed: 0,
    });

    const service = makeStatsService({
      repo: mockRepo as unknown as StatsRepo,
      now: () => fixedNow,
    });

    await service.getStats("auth-user-123");

    // UTC 2:30 PM = NYC 9:30 AM (still Nov 7)
    expect(mockRepo.getTodayProgress).toHaveBeenCalledWith(
      "user-profile-123",
      "2025-11-07",
    );

    expect(mockRepo.getCurrentStreak).toHaveBeenCalledWith(
      "user-profile-123",
      "2025-11-07",
    );

    expect(mockRepo.getWeeklyCompliance).toHaveBeenCalledWith(
      "user-profile-123",
      "2025-11-01",
      "2025-11-07",
    );
  });

  it("uses user timezone for date calculations (London)", async () => {
    mockRepo.getUserProfileId.mockResolvedValue({
      id: "user-profile-123",
      timezone: "Europe/London",
    });

    mockRepo.getTodayProgress.mockResolvedValue({
      total: 0,
      completed: 0,
    });
    mockRepo.getCurrentStreak.mockResolvedValue(0);
    mockRepo.getWeeklyCompliance.mockResolvedValue({
      total: 0,
      completed: 0,
    });

    const service = makeStatsService({
      repo: mockRepo as unknown as StatsRepo,
      now: () => fixedNow,
    });

    await service.getStats("auth-user-123");

    expect(mockRepo.getTodayProgress).toHaveBeenCalledWith(
      "user-profile-123",
      "2025-11-07",
    );

    expect(mockRepo.getWeeklyCompliance).toHaveBeenCalledWith(
      "user-profile-123",
      "2025-11-01",
      "2025-11-07",
    );
  });

  it("uses default timezone when repo returns null timezone", async () => {
    mockRepo.getUserProfileId.mockResolvedValue({
      id: "user-profile-123",
      timezone: null,
    });

    mockRepo.getTodayProgress.mockResolvedValue({
      total: 0,
      completed: 0,
    });
    mockRepo.getCurrentStreak.mockResolvedValue(0);
    mockRepo.getWeeklyCompliance.mockResolvedValue({
      total: 0,
      completed: 0,
    });

    const service = makeStatsService({
      repo: mockRepo as unknown as StatsRepo,
      now: () => fixedNow,
    });

    const result = await service.getStats("auth-user-123");

    expect(result.success).toBe(true);
    expect(mockRepo.getTodayProgress).toHaveBeenCalled();
  });
});
