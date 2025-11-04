// Service tests for percentage calculations and rounding
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeStatsService } from "../../stats.service";
import type { StatsRepo } from "../../stats.repo";

describe("StatsService - Calculations", () => {
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

  it("returns all 3 stats with correct structure", async () => {
    mockRepo.getUserProfileId.mockResolvedValue({
      id: "user-profile-123",
      timezone: "Europe/London",
    });

    mockRepo.getTodayProgress.mockResolvedValue({
      total: 5,
      completed: 3,
    });

    mockRepo.getCurrentStreak.mockResolvedValue(7);

    mockRepo.getWeeklyCompliance.mockResolvedValue({
      total: 35,
      completed: 30,
    });

    const service = makeStatsService({
      repo: mockRepo as unknown as StatsRepo,
      now: () => fixedNow,
    });

    const result = await service.getStats("auth-user-123");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveProperty("todayProgress");
      expect(result.data).toHaveProperty("currentStreak");
      expect(result.data).toHaveProperty("weeklyCompliance");

      expect(result.data.todayProgress).toHaveProperty("completed");
      expect(result.data.todayProgress).toHaveProperty("total");
      expect(result.data.todayProgress).toHaveProperty("percentage");
      expect(result.data.currentStreak).toHaveProperty("days");
      expect(result.data.weeklyCompliance).toHaveProperty("completed");
      expect(result.data.weeklyCompliance).toHaveProperty("total");
      expect(result.data.weeklyCompliance).toHaveProperty("percentage");
    }
  });

  it("calculates today's percentage correctly (3/5 = 60%)", async () => {
    mockRepo.getUserProfileId.mockResolvedValue({
      id: "user-profile-123",
      timezone: "America/New_York",
    });

    mockRepo.getTodayProgress.mockResolvedValue({
      total: 5,
      completed: 3,
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
    if (result.success) {
      expect(result.data.todayProgress.completed).toBe(3);
      expect(result.data.todayProgress.total).toBe(5);
      expect(result.data.todayProgress.percentage).toBe(60);
    }
  });

  it("calculates weekly percentage correctly (30/35 = 86%, rounded)", async () => {
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
      total: 35,
      completed: 30,
    });

    const service = makeStatsService({
      repo: mockRepo as unknown as StatsRepo,
      now: () => fixedNow,
    });

    const result = await service.getStats("auth-user-123");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.weeklyCompliance.completed).toBe(30);
      expect(result.data.weeklyCompliance.total).toBe(35);
      expect(result.data.weeklyCompliance.percentage).toBe(86);
    }
  });

  it("rounds percentages correctly (85.7% → 86%)", async () => {
    mockRepo.getUserProfileId.mockResolvedValue({
      id: "user-profile-123",
      timezone: "Europe/London",
    });

    mockRepo.getTodayProgress.mockResolvedValue({
      total: 7,
      completed: 6, // 6/7 = 85.714285...
    });

    mockRepo.getCurrentStreak.mockResolvedValue(0);

    mockRepo.getWeeklyCompliance.mockResolvedValue({
      total: 35,
      completed: 30, // 30/35 = 85.714285...
    });

    const service = makeStatsService({
      repo: mockRepo as unknown as StatsRepo,
      now: () => fixedNow,
    });

    const result = await service.getStats("auth-user-123");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.todayProgress.percentage).toBe(86);
      expect(result.data.weeklyCompliance.percentage).toBe(86);
    }
  });

  it("returns 0% when total is 0 (avoids division by zero)", async () => {
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

    const result = await service.getStats("auth-user-123");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.todayProgress.percentage).toBe(0);
      expect(result.data.weeklyCompliance.percentage).toBe(0);
    }
  });

  it("returns streak value from repo without modification", async () => {
    mockRepo.getUserProfileId.mockResolvedValue({
      id: "user-profile-123",
      timezone: "Europe/London",
    });

    mockRepo.getTodayProgress.mockResolvedValue({
      total: 5,
      completed: 5,
    });

    mockRepo.getCurrentStreak.mockResolvedValue(15);

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
      expect(result.data.currentStreak.days).toBe(15);
    }
  });

  it("handles 100% completion (perfect week)", async () => {
    mockRepo.getUserProfileId.mockResolvedValue({
      id: "user-profile-123",
      timezone: "Europe/London",
    });

    mockRepo.getTodayProgress.mockResolvedValue({
      total: 5,
      completed: 5,
    });

    mockRepo.getCurrentStreak.mockResolvedValue(30);

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
      expect(result.data.todayProgress.percentage).toBe(100);
      expect(result.data.weeklyCompliance.percentage).toBe(100);
    }
  });
});
