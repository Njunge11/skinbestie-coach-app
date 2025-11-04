import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
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
    getPhotoById: vi.fn(),
  },
}));

import { validateApiKey } from "../../../shared/auth";

describe("GET /api/consumer-app/photos/[photoId] - Validation", () => {
  const photoId = "650e8400-e29b-41d4-a716-446655440001";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateApiKey).mockResolvedValue(true);
  });

  it("returns 400 when userProfileId is missing", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/photos/${photoId}`,
    );

    const response = await GET(request, {
      params: Promise.resolve({ photoId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when userProfileId is invalid UUID", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/photos/${photoId}?userProfileId=invalid-uuid`,
    );

    const response = await GET(request, {
      params: Promise.resolve({ photoId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when photoId is invalid UUID", async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/photos/invalid-photo-id?userProfileId=${userId}`,
    );

    const response = await GET(request, {
      params: Promise.resolve({ photoId: "invalid-photo-id" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });
});
