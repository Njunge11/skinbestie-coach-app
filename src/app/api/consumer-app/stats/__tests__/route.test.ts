// Unit tests for stats API route handler
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { NextRequest } from "next/server";

// Mock the auth module
vi.mock("../../shared/auth", () => ({
  validateApiKey: vi.fn(),
}));

// Mock the service
vi.mock("../stats.service", () => ({
  makeStatsService: vi.fn(),
}));

import { validateApiKey } from "../../shared/auth";
import { makeStatsService } from "../stats.service";

describe("Stats Route - GET /api/consumer-app/stats", () => {
  let mockService: {
    getStats: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock service
    mockService = {
      getStats: vi.fn(),
    };

    (makeStatsService as ReturnType<typeof vi.fn>).mockReturnValue(mockService);
  });

  describe("Authentication", () => {
    it("returns 401 when API key is missing/invalid", async () => {
      // Given: API key validation fails
      (validateApiKey as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/stats?userId=550e8400-e29b-41d4-a716-446655440000",
      );

      // When: Call GET handler
      const response = await GET(request);

      // Then: Returns 401 Unauthorized
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body).toEqual({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or missing API key",
        },
      });

      // Service should not be called
      expect(mockService.getStats).not.toHaveBeenCalled();
    });

    it("accepts valid API key", async () => {
      // Given: Valid API key
      (validateApiKey as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      mockService.getStats.mockResolvedValue({
        success: true,
        data: {
          todayProgress: { completed: 0, total: 0, percentage: 0 },
          currentStreak: { days: 0 },
          weeklyCompliance: { percentage: 0, completed: 0, total: 0 },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/stats?userId=550e8400-e29b-41d4-a716-446655440000",
      );

      // When: Call GET handler
      const response = await GET(request);

      // Then: Proceeds to service call (status 200)
      expect(response.status).toBe(200);
    });
  });

  describe("Request Validation", () => {
    beforeEach(() => {
      // Setup: Valid API key for these tests
      (validateApiKey as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    });

    it("returns 400 when userId is missing", async () => {
      // Given: Request without userId
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/stats",
      );

      // When: Call GET handler
      const response = await GET(request);

      // Then: Returns 400 Bad Request
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error.code).toBe("INVALID_REQUEST");
      expect(body.error.message).toBe("Invalid request parameters");
      expect(body.error.details).toBeDefined();

      // Service should not be called
      expect(mockService.getStats).not.toHaveBeenCalled();
    });

    it("returns 400 when userId is not a valid UUID", async () => {
      // Given: Invalid UUID format
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/stats?userId=invalid-uuid",
      );

      // When: Call GET handler
      const response = await GET(request);

      // Then: Returns 400 Bad Request
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error.code).toBe("INVALID_REQUEST");
      expect(body.error.message).toBe("Invalid request parameters");
      expect(body.error.details).toBeDefined();

      // Service should not be called
      expect(mockService.getStats).not.toHaveBeenCalled();
    });

    it("returns 400 when userId is empty string", async () => {
      // Given: Empty userId
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/stats?userId=",
      );

      // When: Call GET handler
      const response = await GET(request);

      // Then: Returns 400 Bad Request
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error.code).toBe("INVALID_REQUEST");

      // Service should not be called
      expect(mockService.getStats).not.toHaveBeenCalled();
    });

    it("accepts valid UUID userId", async () => {
      // Given: Valid UUID
      const validUserId = "550e8400-e29b-41d4-a716-446655440000";

      mockService.getStats.mockResolvedValue({
        success: true,
        data: {
          todayProgress: { completed: 3, total: 5, percentage: 60 },
          currentStreak: { days: 7 },
          weeklyCompliance: { percentage: 85, completed: 30, total: 35 },
        },
      });

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/stats?userId=${validUserId}`,
      );

      // When: Call GET handler
      const response = await GET(request);

      // Then: Passes validation (status 200)
      expect(response.status).toBe(200);

      // Service called with correct userId
      expect(mockService.getStats).toHaveBeenCalledWith(validUserId);
    });
  });

  describe("Success Response", () => {
    beforeEach(() => {
      (validateApiKey as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    });

    it("returns 200 with correct data structure", async () => {
      // Given: Service returns success
      const mockData = {
        todayProgress: {
          completed: 3,
          total: 5,
          percentage: 60,
        },
        currentStreak: {
          days: 7,
        },
        weeklyCompliance: {
          percentage: 86,
          completed: 30,
          total: 35,
        },
      };

      mockService.getStats.mockResolvedValue({
        success: true,
        data: mockData,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/stats?userId=550e8400-e29b-41d4-a716-446655440000",
      );

      // When: Call GET handler
      const response = await GET(request);

      // Then: Returns 200 with data
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toEqual(mockData);
    });

    it("includes all 3 stats in response", async () => {
      // Given: Service returns all stats
      mockService.getStats.mockResolvedValue({
        success: true,
        data: {
          todayProgress: { completed: 0, total: 0, percentage: 0 },
          currentStreak: { days: 0 },
          weeklyCompliance: { percentage: 0, completed: 0, total: 0 },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/stats?userId=550e8400-e29b-41d4-a716-446655440000",
      );

      // When: Call GET handler
      const response = await GET(request);

      // Then: Response has all 3 stats
      const body = await response.json();

      expect(body).toHaveProperty("todayProgress");
      expect(body).toHaveProperty("currentStreak");
      expect(body).toHaveProperty("weeklyCompliance");
    });

    it("passes userId to service", async () => {
      // Given: Valid request
      const userId = "550e8400-e29b-41d4-a716-446655440000";

      mockService.getStats.mockResolvedValue({
        success: true,
        data: {
          todayProgress: { completed: 0, total: 0, percentage: 0 },
          currentStreak: { days: 0 },
          weeklyCompliance: { percentage: 0, completed: 0, total: 0 },
        },
      });

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/stats?userId=${userId}`,
      );

      // When: Call GET handler
      await GET(request);

      // Then: Service called with correct userId
      expect(mockService.getStats).toHaveBeenCalledWith(userId);
      expect(mockService.getStats).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error Response", () => {
    beforeEach(() => {
      (validateApiKey as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    });

    it("returns 404 when service returns User not found", async () => {
      // Given: Service returns user not found error
      mockService.getStats.mockResolvedValue({
        success: false,
        error: "User not found",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/stats?userId=550e8400-e29b-41d4-a716-446655440000",
      );

      // When: Call GET handler
      const response = await GET(request);

      // Then: Returns 404
      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body).toEqual({
        error: {
          code: "NOT_FOUND",
          message: "User not found",
        },
      });
    });

    it("returns 500 when service returns other errors", async () => {
      // Given: Service returns generic error
      mockService.getStats.mockResolvedValue({
        success: false,
        error: "Failed to fetch user stats",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/stats?userId=550e8400-e29b-41d4-a716-446655440000",
      );

      // When: Call GET handler
      const response = await GET(request);

      // Then: Returns 500
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error.code).toBe("INTERNAL_ERROR");
      expect(body.error.message).toBe("Failed to fetch user stats");
    });

    it("returns 500 when service throws unexpected error", async () => {
      // Given: Service throws unexpected error
      mockService.getStats.mockRejectedValue(new Error("Database crashed"));

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/stats?userId=550e8400-e29b-41d4-a716-446655440000",
      );

      // When: Call GET handler
      const response = await GET(request);

      // Then: Returns 500 with generic message
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error.code).toBe("INTERNAL_ERROR");
      expect(body.error.message).toBe("An internal error occurred");
    });
  });
});
