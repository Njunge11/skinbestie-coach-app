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
import { photoService } from "@/lib/services/photo.service";

describe("GET /api/consumer-app/photos/[photoId] - Error Cases", () => {
  const photoId = "650e8400-e29b-41d4-a716-446655440001";
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateApiKey).mockResolvedValue(true);
  });

  it("returns 404 when photo not found", async () => {
    vi.mocked(photoService.getPhotoById).mockResolvedValue({
      success: false,
      error: "Photo not found",
    });

    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/photos/${photoId}?userProfileId=${userId}`,
    );

    const response = await GET(request, {
      params: Promise.resolve({ photoId }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("returns 500 when photoService.getPhotoById throws error", async () => {
    vi.mocked(photoService.getPhotoById).mockRejectedValue(
      new Error("Unexpected error"),
    );

    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/photos/${photoId}?userProfileId=${userId}`,
    );

    const response = await GET(request, {
      params: Promise.resolve({ photoId }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error.code).toBe("INTERNAL_ERROR");
  });
});
