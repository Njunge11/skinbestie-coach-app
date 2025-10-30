import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "./route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("../shared/auth", () => ({
  validateApiKey: vi.fn(),
}));

vi.mock("./profile.service", () => ({
  makeProfileService: vi.fn(),
}));

import { validateApiKey } from "../shared/auth";
import { makeProfileService } from "./profile.service";

type MockProfileService = {
  updateProfile: ReturnType<typeof vi.fn>;
};

describe("Profile PATCH Route - Unit Tests", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const profileId = "650e8400-e29b-41d4-a716-446655440000";

  let mockService: MockProfileService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockService = {
      updateProfile: vi.fn(),
    };

    vi.mocked(makeProfileService).mockReturnValue(
      mockService as ReturnType<typeof makeProfileService>,
    );
  });

  it("returns 401 when API key is invalid", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(false);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/profile",
      {
        method: "PATCH",
        body: JSON.stringify({ userId, nickname: "skinny" }),
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
      "http://localhost:3000/api/consumer-app/profile",
      {
        method: "PATCH",
        body: JSON.stringify({ userId: "invalid-id", nickname: "skinny" }),
      },
    );

    const response = await PATCH(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 404 when user not found", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    mockService.updateProfile.mockResolvedValue({
      success: false,
      error: "User not found",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/profile",
      {
        method: "PATCH",
        body: JSON.stringify({ userId, nickname: "skinny" }),
      },
    );

    const response = await PATCH(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("returns 200 with updated profile on success", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    mockService.updateProfile.mockResolvedValue({
      success: true,
      data: {
        id: profileId,
        userId,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        nickname: "skinny",
        phoneNumber: "+1234567890",
        updatedAt: new Date("2025-01-15T10:30:00Z"),
      },
    });

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/profile",
      {
        method: "PATCH",
        body: JSON.stringify({ userId, nickname: "skinny" }),
      },
    );

    const response = await PATCH(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.nickname).toBe("skinny");
  });

  it("returns 500 when service throws error", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    mockService.updateProfile.mockResolvedValue({
      success: false,
      error: "Database connection failed",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/profile",
      {
        method: "PATCH",
        body: JSON.stringify({ userId, nickname: "skinny" }),
      },
    );

    const response = await PATCH(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error.code).toBe("INTERNAL_ERROR");
  });
});
