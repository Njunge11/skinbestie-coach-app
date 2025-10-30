// Unit tests for dashboard API route
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("../shared/auth", () => ({
  validateApiKey: vi.fn(),
}));

vi.mock("./dashboard.service", () => ({
  makeDashboardService: vi.fn(() => ({
    getConsumerDashboard: vi.fn(),
  })),
}));

// Import after mocking
import { validateApiKey } from "../shared/auth";
import { makeDashboardService } from "./dashboard.service";

describe("Dashboard API Route", () => {
  const mockValidateApiKey = validateApiKey as ReturnType<typeof vi.fn>;
  const mockMakeService = makeDashboardService as ReturnType<typeof vi.fn>;
  let mockService: { getConsumerDashboard: ReturnType<typeof vi.fn> };

  const validUserId = "550e8400-e29b-41d4-a716-446655440000";
  const mockProfileData = {
    user: {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
    },
    setupProgress: {
      percentage: 100,
      completed: 4,
      total: 4,
      steps: {
        hasCompletedSkinTest: true,
        hasPublishedGoals: true,
        hasPublishedRoutine: true,
        hasCompletedBooking: true,
      },
    },
    todayRoutine: null,
    goals: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getConsumerDashboard: vi.fn(),
    };
    mockMakeService.mockReturnValue(mockService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/consumer-app/dashboard", () => {
    it("returns dashboard successfully with valid API key and userId", async () => {
      // Given
      mockValidateApiKey.mockResolvedValue(true);
      mockService.getConsumerDashboard.mockResolvedValue({
        success: true,
        data: mockProfileData,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/dashboard?userId=${validUserId}`,
      );

      // When
      const response = await GET(request);
      const data = await response.json();

      // Then
      expect(response.status).toBe(200);
      expect(data).toEqual(mockProfileData);
      expect(mockValidateApiKey).toHaveBeenCalledTimes(1);
      expect(mockService.getConsumerDashboard).toHaveBeenCalledWith(
        validUserId,
      );
    });

    it("returns 401 when API key is invalid", async () => {
      // Given
      mockValidateApiKey.mockResolvedValue(false);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/dashboard?userId=${validUserId}`,
      );

      // When
      const response = await GET(request);
      const data = await response.json();

      // Then
      expect(response.status).toBe(401);
      expect(data.error.code).toBe("UNAUTHORIZED");
      expect(data.error.message).toBe("Invalid or missing API key");
      expect(mockService.getConsumerDashboard).not.toHaveBeenCalled();
    });

    it("returns 400 when userId is missing", async () => {
      // Given
      mockValidateApiKey.mockResolvedValue(true);

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/dashboard",
      );

      // When
      const response = await GET(request);
      const data = await response.json();

      // Then
      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_REQUEST");
      expect(data.error.message).toContain("Invalid request parameters");
      expect(mockService.getConsumerDashboard).not.toHaveBeenCalled();
    });

    it("returns 400 when userId is invalid format", async () => {
      // Given
      mockValidateApiKey.mockResolvedValue(true);

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/dashboard?userId=invalid-uuid",
      );

      // When
      const response = await GET(request);
      const data = await response.json();

      // Then
      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_REQUEST");
      expect(data.error.message).toContain("Invalid request parameters");
      expect(mockService.getConsumerDashboard).not.toHaveBeenCalled();
    });

    it("returns 404 when user is not found", async () => {
      // Given
      mockValidateApiKey.mockResolvedValue(true);
      mockService.getConsumerDashboard.mockResolvedValue({
        success: false,
        error: "User not found",
      });

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/dashboard?userId=${validUserId}`,
      );

      // When
      const response = await GET(request);
      const data = await response.json();

      // Then
      expect(response.status).toBe(404);
      expect(data.error.code).toBe("NOT_FOUND");
      expect(data.error.message).toBe("User not found");
      expect(mockService.getConsumerDashboard).toHaveBeenCalledWith(
        validUserId,
      );
    });

    it("returns 500 when service throws error", async () => {
      // Given
      mockValidateApiKey.mockResolvedValue(true);
      mockService.getConsumerDashboard.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/dashboard?userId=${validUserId}`,
      );

      // When
      const response = await GET(request);
      const data = await response.json();

      // Then
      expect(response.status).toBe(500);
      expect(data.error.code).toBe("INTERNAL_ERROR");
      expect(data.error.message).toBe("An internal error occurred");
    });

    it("returns 500 when service returns other errors", async () => {
      // Given
      mockValidateApiKey.mockResolvedValue(true);
      mockService.getConsumerDashboard.mockResolvedValue({
        success: false,
        error: "Failed to retrieve dashboard",
      });

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/dashboard?userId=${validUserId}`,
      );

      // When
      const response = await GET(request);
      const data = await response.json();

      // Then
      expect(response.status).toBe(500);
      expect(data.error.code).toBe("INTERNAL_ERROR");
      expect(data.error.message).toBe("Failed to retrieve dashboard");
    });

    it("handles API key validation errors gracefully", async () => {
      // Given
      mockValidateApiKey.mockRejectedValue(new Error("Headers not available"));

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/dashboard?userId=${validUserId}`,
      );

      // When
      const response = await GET(request);
      const data = await response.json();

      // Then
      expect(response.status).toBe(500);
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });

    it("returns profile with empty routine and goals arrays", async () => {
      // Given
      const profileWithEmptyArrays = {
        ...mockProfileData,
        todayRoutine: [],
        goals: [],
      };

      mockValidateApiKey.mockResolvedValue(true);
      mockService.getConsumerDashboard.mockResolvedValue({
        success: true,
        data: profileWithEmptyArrays,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/dashboard?userId=${validUserId}`,
      );

      // When
      const response = await GET(request);
      const data = await response.json();

      // Then
      expect(response.status).toBe(200);
      expect(data).toEqual(profileWithEmptyArrays);
      expect(data.todayRoutine).toEqual([]);
      expect(data.goals).toEqual([]);
    });

    it("returns profile with partial setup progress", async () => {
      // Given
      const profileWithPartialProgress = {
        ...mockProfileData,
        setupProgress: {
          percentage: 50,
          completed: 2,
          total: 4,
          steps: {
            hasCompletedSkinTest: true,
            hasPublishedGoals: false,
            hasPublishedRoutine: true,
            hasCompletedBooking: false,
          },
        },
      };

      mockValidateApiKey.mockResolvedValue(true);
      mockService.getConsumerDashboard.mockResolvedValue({
        success: true,
        data: profileWithPartialProgress,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/dashboard?userId=${validUserId}`,
      );

      // When
      const response = await GET(request);
      const data = await response.json();

      // Then
      expect(response.status).toBe(200);
      expect(data.setupProgress.percentage).toBe(50);
      expect(data.setupProgress.completed).toBe(2);
      expect(data.setupProgress.total).toBe(4);
    });
  });
});
