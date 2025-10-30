// Route handler tests for PATCH /api/consumer-app/goals/acknowledge
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "./route";
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
  acknowledgeGoals: ReturnType<typeof vi.fn>;
};

describe("Goals Acknowledge PATCH Route - Unit Tests", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  let mockService: MockGoalsService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockService = {
      acknowledgeGoals: vi.fn(),
    };

    vi.mocked(makeGoalsService).mockReturnValue(
      mockService as unknown as ReturnType<typeof makeGoalsService>,
    );
  });

  describe("Authentication", () => {
    it("returns 401 when API key is missing", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(false);

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals/acknowledge",
        {
          method: "PATCH",
          body: JSON.stringify({ userId, goalsAcknowledgedByClient: true }),
        },
      );

      const response = await PATCH(request);

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
        "http://localhost:3000/api/consumer-app/goals/acknowledge",
        {
          method: "PATCH",
          body: JSON.stringify({ goalsAcknowledgedByClient: true }),
        },
      );

      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when userId is invalid UUID", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals/acknowledge",
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: "invalid-id",
            goalsAcknowledgedByClient: true,
          }),
        },
      );

      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when goalsAcknowledgedByClient is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals/acknowledge",
        {
          method: "PATCH",
          body: JSON.stringify({ userId }),
        },
      );

      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when goalsAcknowledgedByClient is not boolean", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals/acknowledge",
        {
          method: "PATCH",
          body: JSON.stringify({
            userId,
            goalsAcknowledgedByClient: "not-a-boolean",
          }),
        },
      );

      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when request body is invalid JSON", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals/acknowledge",
        {
          method: "PATCH",
          body: "invalid json",
        },
      );

      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });
  });

  describe("Happy Path", () => {
    beforeEach(() => {
      vi.mocked(validateApiKey).mockResolvedValue(true);
    });

    it("returns 200 with success when goals acknowledged", async () => {
      mockService.acknowledgeGoals.mockResolvedValue({
        success: true,
        data: undefined,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals/acknowledge",
        {
          method: "PATCH",
          body: JSON.stringify({ userId, goalsAcknowledgedByClient: true }),
        },
      );

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockService.acknowledgeGoals).toHaveBeenCalledWith(userId, true);
    });

    it("accepts false for goalsAcknowledgedByClient", async () => {
      mockService.acknowledgeGoals.mockResolvedValue({
        success: true,
        data: undefined,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals/acknowledge",
        {
          method: "PATCH",
          body: JSON.stringify({ userId, goalsAcknowledgedByClient: false }),
        },
      );

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(mockService.acknowledgeGoals).toHaveBeenCalledWith(userId, false);
    });
  });

  describe("Error Cases", () => {
    beforeEach(() => {
      vi.mocked(validateApiKey).mockResolvedValue(true);
    });

    it("returns 404 when user not found", async () => {
      mockService.acknowledgeGoals.mockResolvedValue({
        success: false,
        error: "User not found",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals/acknowledge",
        {
          method: "PATCH",
          body: JSON.stringify({ userId, goalsAcknowledgedByClient: true }),
        },
      );

      const response = await PATCH(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 when template not found", async () => {
      mockService.acknowledgeGoals.mockResolvedValue({
        success: false,
        error: "Goals template not found",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals/acknowledge",
        {
          method: "PATCH",
          body: JSON.stringify({ userId, goalsAcknowledgedByClient: true }),
        },
      );

      const response = await PATCH(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error.code).toBe("NOT_FOUND");
    });

    it("returns 500 when service throws unexpected error", async () => {
      mockService.acknowledgeGoals.mockResolvedValue({
        success: false,
        error: "Failed to acknowledge goals",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/goals/acknowledge",
        {
          method: "PATCH",
          body: JSON.stringify({ userId, goalsAcknowledgedByClient: true }),
        },
      );

      const response = await PATCH(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });
  });
});
