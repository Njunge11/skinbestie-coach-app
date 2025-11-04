import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "../route";
import { NextRequest } from "next/server";

// Mock Next.js headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockReturnValue({
    get: vi.fn(),
  }),
}));

// Mock dependencies
vi.mock("../../../shared/auth", () => ({
  validateApiKey: vi.fn(),
}));

vi.mock("@/lib/services/photo.service", () => ({
  photoService: {
    deletePhoto: vi.fn(),
  },
}));

import { validateApiKey } from "../../../shared/auth";

describe("DELETE /api/consumer-app/photos/[photoId] - Authentication", () => {
  const photoId = "650e8400-e29b-41d4-a716-446655440001";
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when API key is missing", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(false);

    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/photos/${photoId}?userProfileId=${userId}`,
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ photoId }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when API key is invalid", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(false);

    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/photos/${photoId}?userProfileId=${userId}`,
      {
        method: "DELETE",
        headers: {
          "x-api-key": "invalid-key",
        },
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ photoId }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error.code).toBe("UNAUTHORIZED");
  });
});
