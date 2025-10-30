// Route handler tests for POST /api/consumer-app/goals
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { makeGoal } from "@/test/factories";

// Mock dependencies
vi.mock("../shared/auth", () => ({
  validateApiKey: vi.fn(),
}));

vi.mock("./goals.service", () => ({
  makeGoalsService: vi.fn(),
}));

import { validateApiKey } from "../shared/auth";
import { makeGoalsService } from "./goals.service";

type MockGoalsService = {
  createGoal: ReturnType<typeof vi.fn>;
};

describe("Goals POST Route - Unit Tests", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const templateId = "750e8400-e29b-41d4-a716-446655440000";
  const goalId = "850e8400-e29b-41d4-a716-446655440000";
  const fixedNow = new Date("2025-01-15T10:30:00Z");

  let mockService: MockGoalsService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockService = {
      createGoal: vi.fn(),
    };

    vi.mocked(makeGoalsService).mockReturnValue(
      mockService as unknown as ReturnType<typeof makeGoalsService>,
    );
  });

  describe("Authentication", () => {
    it("returns 401 when API key is missing", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(false);

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals",
        {
          method: "POST",
          body: JSON.stringify({ userId, description: "Test goal" }),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 when API key is invalid", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(false);

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals",
        {
          method: "POST",
          headers: {
            "x-api-key": "invalid-key",
          },
          body: JSON.stringify({ userId, description: "Test goal" }),
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
        "http://localhost:3000/api/consumer-app/goals",
        {
          method: "POST",
          body: JSON.stringify({ description: "Test goal" }),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when userId is invalid UUID", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "invalid-id",
            description: "Test goal",
          }),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when description is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals",
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

    it("returns 400 when description is empty string", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals",
        {
          method: "POST",
          body: JSON.stringify({ userId, description: "" }),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when request body is invalid JSON", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals",
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

    it("returns 201 with created goal when valid data provided", async () => {
      const createdGoal = makeGoal({
        id: goalId,
        templateId,
        description: "Clear skin",
        isPrimaryGoal: false,
        complete: false,
        completedAt: null,
        order: 0,
        createdAt: fixedNow,
        updatedAt: fixedNow,
      });

      mockService.createGoal.mockResolvedValue({
        success: true,
        data: createdGoal,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals",
        {
          method: "POST",
          body: JSON.stringify({ userId, description: "Clear skin" }),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.description).toBe("Clear skin");
      expect(data.data.id).toBe(goalId);
    });

    it("returns goal with all fields in response", async () => {
      const createdGoal = makeGoal({
        id: goalId,
        templateId,
        description: "Reduce acne",
        isPrimaryGoal: true,
        complete: false,
        completedAt: null,
        order: 1,
        createdAt: fixedNow,
        updatedAt: fixedNow,
      });

      mockService.createGoal.mockResolvedValue({
        success: true,
        data: createdGoal,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals",
        {
          method: "POST",
          body: JSON.stringify({
            userId,
            description: "Reduce acne",
            isPrimaryGoal: true,
          }),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data).toMatchObject({
        id: goalId,
        templateId,
        description: "Reduce acne",
        isPrimaryGoal: true,
        complete: false,
        completedAt: null,
        order: 1,
      });
      expect(data.data.createdAt).toBeDefined();
      expect(data.data.updatedAt).toBeDefined();
    });
  });

  describe("Error Cases", () => {
    beforeEach(() => {
      vi.mocked(validateApiKey).mockResolvedValue(true);
    });

    it("returns 404 when template doesn't exist", async () => {
      mockService.createGoal.mockResolvedValue({
        success: false,
        error: "Goals template not found",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals",
        {
          method: "POST",
          body: JSON.stringify({ userId, description: "Test goal" }),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error.code).toBe("NOT_FOUND");
      expect(data.error.message).toBe("Goals template not found");
    });

    it("returns 404 when user not found", async () => {
      mockService.createGoal.mockResolvedValue({
        success: false,
        error: "User not found",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals",
        {
          method: "POST",
          body: JSON.stringify({ userId, description: "Test goal" }),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error.code).toBe("NOT_FOUND");
      expect(data.error.message).toBe("User not found");
    });

    it("returns 500 when service throws unexpected error", async () => {
      mockService.createGoal.mockResolvedValue({
        success: false,
        error: "Failed to create goal",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals",
        {
          method: "POST",
          body: JSON.stringify({ userId, description: "Test goal" }),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });
  });
});
