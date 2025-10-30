// Route handler tests for PATCH/DELETE /api/consumer-app/goals/[goalId]
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "./route";
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
  createGoal: ReturnType<typeof vi.fn>;
  updateGoal: ReturnType<typeof vi.fn>;
  deleteGoal: ReturnType<typeof vi.fn>;
  reorderGoals: ReturnType<typeof vi.fn>;
  acknowledgeGoals: ReturnType<typeof vi.fn>;
};

describe("Goals PATCH [goalId] Route - Unit Tests", () => {
  const goalId = "850e8400-e29b-41d4-a716-446655440000";

  let mockService: MockGoalsService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockService = {
      createGoal: vi.fn(),
      updateGoal: vi.fn(),
      deleteGoal: vi.fn(),
      reorderGoals: vi.fn(),
      acknowledgeGoals: vi.fn(),
    };

    vi.mocked(makeGoalsService).mockReturnValue(
      mockService as ReturnType<typeof makeGoalsService>,
    );
  });

  describe("Authentication", () => {
    it("returns 401 when API key is missing", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(false);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/goals/${goalId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ description: "Updated goal" }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ goalId }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 when API key is invalid", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(false);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/goals/${goalId}`,
        {
          method: "PATCH",
          headers: {
            "x-api-key": "invalid-key",
          },
          body: JSON.stringify({ description: "Updated goal" }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ goalId }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Validation", () => {
    beforeEach(() => {
      vi.mocked(validateApiKey).mockResolvedValue(true);
    });

    it("returns 400 when goalId in URL is invalid UUID", async () => {
      const invalidGoalId = "invalid-id";
      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/goals/${invalidGoalId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ description: "Updated" }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ goalId: invalidGoalId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when description is empty", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/goals/${goalId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ description: "" }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ goalId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when request body is invalid JSON", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/goals/${goalId}`,
        {
          method: "PATCH",
          body: "invalid json",
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ goalId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });
  });

  describe("Happy Path", () => {
    beforeEach(() => {
      vi.mocked(validateApiKey).mockResolvedValue(true);
    });

    it("returns 200 with success when goal updated", async () => {
      mockService.updateGoal.mockResolvedValue({
        success: true,
        data: undefined,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/goals/${goalId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ description: "Updated description" }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ goalId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("updates only provided fields", async () => {
      mockService.updateGoal.mockResolvedValue({
        success: true,
        data: undefined,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/goals/${goalId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ isPrimaryGoal: true }),
        },
      );

      await PATCH(request, { params: Promise.resolve({ goalId }) });

      expect(mockService.updateGoal).toHaveBeenCalledWith(
        goalId,
        expect.objectContaining({
          isPrimaryGoal: true,
        }),
      );
      expect(mockService.updateGoal).toHaveBeenCalledWith(
        goalId,
        expect.not.objectContaining({
          description: expect.anything(),
          complete: expect.anything(),
        }),
      );
    });
  });

  describe("Error Cases", () => {
    beforeEach(() => {
      vi.mocked(validateApiKey).mockResolvedValue(true);
    });

    it("returns 404 when goal not found", async () => {
      mockService.updateGoal.mockResolvedValue({
        success: false,
        error: "Goal not found",
      });

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/goals/${goalId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ description: "Updated" }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ goalId }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error.code).toBe("NOT_FOUND");
      expect(data.error.message).toBe("Goal not found");
    });

    it("returns 500 when service throws unexpected error", async () => {
      mockService.updateGoal.mockResolvedValue({
        success: false,
        error: "Failed to update goal",
      });

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/goals/${goalId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ description: "Updated" }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ goalId }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });
  });
});

describe("Goals DELETE [goalId] Route - Unit Tests", () => {
  const goalId = "850e8400-e29b-41d4-a716-446655440000";

  let mockService: MockGoalsService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockService = {
      createGoal: vi.fn(),
      updateGoal: vi.fn(),
      deleteGoal: vi.fn(),
      reorderGoals: vi.fn(),
      acknowledgeGoals: vi.fn(),
    };

    vi.mocked(makeGoalsService).mockReturnValue(
      mockService as ReturnType<typeof makeGoalsService>,
    );
  });

  describe("Authentication", () => {
    it("returns 401 when API key is missing", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(false);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/goals/${goalId}`,
        { method: "DELETE" },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ goalId }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Validation", () => {
    beforeEach(() => {
      vi.mocked(validateApiKey).mockResolvedValue(true);
    });

    it("returns 400 when goalId in URL is invalid UUID", async () => {
      const invalidGoalId = "invalid-id";
      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/goals/${invalidGoalId}`,
        { method: "DELETE" },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ goalId: invalidGoalId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });
  });

  describe("Happy Path", () => {
    beforeEach(() => {
      vi.mocked(validateApiKey).mockResolvedValue(true);
    });

    it("returns 200 with success when goal deleted", async () => {
      mockService.deleteGoal.mockResolvedValue({
        success: true,
        data: undefined,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/goals/${goalId}`,
        { method: "DELETE" },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ goalId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockService.deleteGoal).toHaveBeenCalledWith(goalId);
    });
  });

  describe("Error Cases", () => {
    beforeEach(() => {
      vi.mocked(validateApiKey).mockResolvedValue(true);
    });

    it("returns 404 when goal not found", async () => {
      mockService.deleteGoal.mockResolvedValue({
        success: false,
        error: "Goal not found",
      });

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/goals/${goalId}`,
        { method: "DELETE" },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ goalId }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error.code).toBe("NOT_FOUND");
    });

    it("returns 500 when service throws unexpected error", async () => {
      mockService.deleteGoal.mockResolvedValue({
        success: false,
        error: "Failed to delete goal",
      });

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/goals/${goalId}`,
        { method: "DELETE" },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ goalId }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });
  });
});
