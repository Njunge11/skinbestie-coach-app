// Route handler tests for completion endpoint
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "../route";

// Mock the auth module
vi.mock("../../../shared/auth", () => ({
  validateApiKey: vi.fn(),
}));

// Mock the service
vi.mock("../completion.service", () => ({
  makeCompletionService: vi.fn(),
}));

import { validateApiKey } from "../../../shared/auth";
import { makeCompletionService } from "../completion.service";

describe("PATCH /api/consumer-app/dashboard/routine-steps", () => {
  let mockService: {
    updateCompletion: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default service mock
    mockService = {
      updateCompletion: vi.fn(),
    };

    vi.mocked(makeCompletionService).mockReturnValue(mockService);
  });

  describe("Authentication", () => {
    it("returns 401 when API key is invalid", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(false);

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/dashboard/routine-steps",
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: "550e8400-e29b-41d4-a716-446655440000",
            stepId: "850e8400-e29b-41d4-a716-446655440001",
            completed: true,
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe("UNAUTHORIZED");
      expect(data.error.message).toBe("Invalid or missing API key");
    });
  });

  describe("Request Validation", () => {
    beforeEach(() => {
      vi.mocked(validateApiKey).mockResolvedValue(true);
    });

    it("returns 400 when userId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/dashboard/routine-steps",
        {
          method: "PATCH",
          body: JSON.stringify({
            stepId: "850e8400-e29b-41d4-a716-446655440001",
            completed: true,
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when userId is not a valid UUID", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/dashboard/routine-steps",
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: "invalid-uuid",
            stepId: "850e8400-e29b-41d4-a716-446655440001",
            completed: true,
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when completed is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/dashboard/routine-steps",
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: "550e8400-e29b-41d4-a716-446655440000",
            stepId: "850e8400-e29b-41d4-a716-446655440001",
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when neither stepId nor date provided", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/dashboard/routine-steps",
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: "550e8400-e29b-41d4-a716-446655440000",
            completed: true,
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_REQUEST");
      expect(data.error.message).toContain("Either stepId or date");
    });

    it("returns 400 when both stepId and date provided", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/dashboard/routine-steps",
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: "550e8400-e29b-41d4-a716-446655440000",
            stepId: "850e8400-e29b-41d4-a716-446655440001",
            date: "2025-11-07",
            completed: true,
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_REQUEST");
      expect(data.error.message).toContain("Cannot provide both");
    });

    it("returns 400 when stepId is not a valid UUID", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/dashboard/routine-steps",
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: "550e8400-e29b-41d4-a716-446655440000",
            stepId: "invalid-uuid",
            completed: true,
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when date is not in YYYY-MM-DD format", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/dashboard/routine-steps",
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: "550e8400-e29b-41d4-a716-446655440000",
            date: "11/07/2025",
            completed: true,
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when completed is not a boolean", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/dashboard/routine-steps",
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: "550e8400-e29b-41d4-a716-446655440000",
            stepId: "850e8400-e29b-41d4-a716-446655440001",
            completed: "true",
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_REQUEST");
    });
  });

  describe("Success Cases", () => {
    beforeEach(() => {
      vi.mocked(validateApiKey).mockResolvedValue(true);
    });

    it("successfully updates single step", async () => {
      const mockCompletion = {
        id: "850e8400-e29b-41d4-a716-446655440001",
        routineProductId: "750e8400-e29b-41d4-a716-446655440001",
        userProfileId: "550e8400-e29b-41d4-a716-446655440000",
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-07T14:00:00Z"),
        gracePeriodEnd: new Date("2025-11-07T20:00:00Z"),
        completedAt: new Date("2025-11-07T08:00:00Z"),
        status: "on-time",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.updateCompletion.mockResolvedValue({
        success: true,
        data: mockCompletion,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/dashboard/routine-steps",
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: "550e8400-e29b-41d4-a716-446655440000",
            stepId: "850e8400-e29b-41d4-a716-446655440001",
            completed: true,
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockCompletion);
      expect(mockService.updateCompletion).toHaveBeenCalledWith({
        userId: "550e8400-e29b-41d4-a716-446655440000",
        stepId: "850e8400-e29b-41d4-a716-446655440001",
        completed: true,
      });
    });

    it("successfully updates all steps for date", async () => {
      const mockCompletions = [
        {
          id: "850e8400-e29b-41d4-a716-446655440001",
          routineProductId: "750e8400-e29b-41d4-a716-446655440001",
          userProfileId: "550e8400-e29b-41d4-a716-446655440000",
          scheduledDate: new Date("2025-11-07"),
          scheduledTimeOfDay: "morning",
          onTimeDeadline: new Date("2025-11-07T14:00:00Z"),
          gracePeriodEnd: new Date("2025-11-07T20:00:00Z"),
          completedAt: new Date("2025-11-07T08:00:00Z"),
          status: "on-time",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockService.updateCompletion.mockResolvedValue({
        success: true,
        data: mockCompletions,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/dashboard/routine-steps",
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: "550e8400-e29b-41d4-a716-446655440000",
            date: "2025-11-07",
            completed: true,
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockCompletions);
      expect(mockService.updateCompletion).toHaveBeenCalledWith({
        userId: "550e8400-e29b-41d4-a716-446655440000",
        date: "2025-11-07",
        completed: true,
      });
    });

    it("successfully marks step as incomplete", async () => {
      const mockCompletion = {
        id: "850e8400-e29b-41d4-a716-446655440001",
        routineProductId: "750e8400-e29b-41d4-a716-446655440001",
        userProfileId: "550e8400-e29b-41d4-a716-446655440000",
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "morning",
        onTimeDeadline: new Date("2025-11-07T14:00:00Z"),
        gracePeriodEnd: new Date("2025-11-07T20:00:00Z"),
        completedAt: null,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.updateCompletion.mockResolvedValue({
        success: true,
        data: mockCompletion,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/dashboard/routine-steps",
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: "550e8400-e29b-41d4-a716-446655440000",
            stepId: "850e8400-e29b-41d4-a716-446655440001",
            completed: false,
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockCompletion);
    });

    it("returns empty array when no steps found for date", async () => {
      mockService.updateCompletion.mockResolvedValue({
        success: true,
        data: [],
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/dashboard/routine-steps",
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: "550e8400-e29b-41d4-a716-446655440000",
            date: "2025-11-07",
            completed: true,
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });
  });

  describe("Error Cases", () => {
    beforeEach(() => {
      vi.mocked(validateApiKey).mockResolvedValue(true);
    });

    it("returns 404 when step not found", async () => {
      mockService.updateCompletion.mockResolvedValue({
        success: false,
        error: "Step not found or not authorized",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/dashboard/routine-steps",
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: "550e8400-e29b-41d4-a716-446655440000",
            stepId: "850e8400-e29b-41d4-a716-446655440001",
            completed: true,
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe("NOT_FOUND");
      expect(data.error.message).toBe("Step not found or not authorized");
    });

    it("returns 500 for generic service errors", async () => {
      mockService.updateCompletion.mockResolvedValue({
        success: false,
        error: "Database connection failed",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/dashboard/routine-steps",
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: "550e8400-e29b-41d4-a716-446655440000",
            stepId: "850e8400-e29b-41d4-a716-446655440001",
            completed: true,
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe("INTERNAL_ERROR");
      expect(data.error.message).toBe("Database connection failed");
    });

    it("returns 500 when unexpected error occurs", async () => {
      mockService.updateCompletion.mockRejectedValue(
        new Error("Unexpected error"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/dashboard/routine-steps",
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: "550e8400-e29b-41d4-a716-446655440000",
            stepId: "850e8400-e29b-41d4-a716-446655440001",
            completed: true,
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe("INTERNAL_ERROR");
      expect(data.error.message).toBe("An internal error occurred");
    });
  });
});
