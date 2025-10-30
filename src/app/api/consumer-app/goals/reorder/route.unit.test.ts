// Route handler tests for POST /api/consumer-app/goals/reorder
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("../../shared/auth", () => ({
  validateApiKey: vi.fn(),
}));

vi.mock("../goals.service", () => ({
  makeGoalsService: vi.fn(),
}));

import { validateApiKey } from "../../shared/auth";
import { makeGoalsService } from "../goals.service";

type MockGoalsService = {
  reorderGoals: ReturnType<typeof vi.fn>;
};

describe("Goals Reorder POST Route - Unit Tests", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const goal1Id = "850e8400-e29b-41d4-a716-446655440001";
  const goal2Id = "850e8400-e29b-41d4-a716-446655440002";

  let mockService: MockGoalsService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockService = {
      reorderGoals: vi.fn(),
    };

    vi.mocked(makeGoalsService).mockReturnValue(
      mockService as unknown as ReturnType<typeof makeGoalsService>,
    );
  });

  describe("Authentication", () => {
    it("returns 401 when API key is missing", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(false);

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals/reorder",
        {
          method: "POST",
          body: JSON.stringify({ userId, goalIds: [goal1Id, goal2Id] }),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Validation", () => {
    beforeEach(() => {
      vi.mocked(validateApiKey).mockResolvedValue(true);
    });

    it("returns 400 when userId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals/reorder",
        {
          method: "POST",
          body: JSON.stringify({ goalIds: [goal1Id] }),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when userId is invalid UUID", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals/reorder",
        {
          method: "POST",
          body: JSON.stringify({ userId: "invalid-id", goalIds: [goal1Id] }),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when goalIds is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals/reorder",
        {
          method: "POST",
          body: JSON.stringify({ userId }),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when goalIds is not an array", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals/reorder",
        {
          method: "POST",
          body: JSON.stringify({ userId, goalIds: "not-an-array" }),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when goalIds is empty array", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals/reorder",
        {
          method: "POST",
          body: JSON.stringify({ userId, goalIds: [] }),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when request body is invalid JSON", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals/reorder",
        {
          method: "POST",
          body: "invalid json",
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });
  });

  describe("Happy Path", () => {
    beforeEach(() => {
      vi.mocked(validateApiKey).mockResolvedValue(true);
    });

    it("returns 200 with success when goals reordered", async () => {
      mockService.reorderGoals.mockResolvedValue({
        success: true,
        data: undefined,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals/reorder",
        {
          method: "POST",
          body: JSON.stringify({ userId, goalIds: [goal2Id, goal1Id] }),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockService.reorderGoals).toHaveBeenCalledWith(userId, [
        goal2Id,
        goal1Id,
      ]);
    });
  });

  describe("Error Cases", () => {
    beforeEach(() => {
      vi.mocked(validateApiKey).mockResolvedValue(true);
    });

    it("returns 404 when template not found", async () => {
      mockService.reorderGoals.mockResolvedValue({
        success: false,
        error: "Goals template not found",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals/reorder",
        {
          method: "POST",
          body: JSON.stringify({ userId, goalIds: [goal1Id] }),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error.code).toBe("NOT_FOUND");
    });

    it("returns 500 when service throws unexpected error", async () => {
      mockService.reorderGoals.mockResolvedValue({
        success: false,
        error: "Failed to reorder goals",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals/reorder",
        {
          method: "POST",
          body: JSON.stringify({ userId, goalIds: [goal1Id] }),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });
  });
});
