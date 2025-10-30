import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "./route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("../shared/auth", () => ({
  validateApiKey: vi.fn(),
}));

vi.mock("./goals-template.service", () => ({
  makeGoalsTemplateService: vi.fn(),
}));

import { validateApiKey } from "../shared/auth";
import { makeGoalsTemplateService } from "./goals-template.service";

type MockGoalsTemplateService = {
  updateGoalsTemplate: ReturnType<typeof vi.fn>;
};

describe("GoalsTemplate PATCH Route - Unit Tests", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const profileId = "650e8400-e29b-41d4-a716-446655440000";
  const templateId = "750e8400-e29b-41d4-a716-446655440000";

  let mockService: MockGoalsTemplateService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockService = {
      updateGoalsTemplate: vi.fn(),
    };

    vi.mocked(makeGoalsTemplateService).mockReturnValue(
      mockService as ReturnType<typeof makeGoalsTemplateService>,
    );
  });

  it("returns 401 when API key is invalid", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(false);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/goals-template",
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

  it("returns 400 when userId is invalid format", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/goals-template",
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

  it("returns 404 when user not found", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    mockService.updateGoalsTemplate.mockResolvedValue({
      success: false,
      error: "User not found",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/goals-template",
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

  it("returns 404 when goals template not found", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    mockService.updateGoalsTemplate.mockResolvedValue({
      success: false,
      error: "Goals template not found",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/goals-template",
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

  it("returns 200 with updated template on success", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    mockService.updateGoalsTemplate.mockResolvedValue({
      success: true,
      data: {
        id: templateId,
        userId: profileId,
        status: "published",
        goalsAcknowledgedByClient: true,
        updatedAt: new Date("2025-01-15T10:30:00Z"),
      },
    });

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/goals-template",
      {
        method: "PATCH",
        body: JSON.stringify({ userId, goalsAcknowledgedByClient: true }),
      },
    );

    const response = await PATCH(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.goalsAcknowledgedByClient).toBe(true);
  });

  it("returns 500 when service throws error", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    mockService.updateGoalsTemplate.mockResolvedValue({
      success: false,
      error: "Database connection failed",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/goals-template",
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
