import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
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
    createPhoto: vi.fn(),
  },
}));

import { validateApiKey } from "../../../shared/auth";
import { photoService } from "@/lib/services/photo.service";

describe("POST /api/consumer-app/photos/confirm - Error Cases", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const photoId = "650e8400-e29b-41d4-a716-446655440001";
  const s3Key = `photos/users/${userId}/2025-11-04/${photoId}.jpg`;
  const s3Bucket = "test-bucket";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateApiKey).mockResolvedValue(true);
  });

  it("returns 500 when photoService.createPhoto fails", async () => {
    vi.mocked(photoService.createPhoto).mockResolvedValue({
      success: false,
      error: "Database connection failed",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos/confirm",
      {
        method: "POST",
        body: JSON.stringify({
          userProfileId: userId,
          s3Key,
          s3Bucket,
          bytes: 2500000,
          mime: "image/jpeg",
          imageUrl: `https://${s3Bucket}.s3.amazonaws.com/${s3Key}`,
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error.code).toBe("INTERNAL_ERROR");
  });

  it("returns 500 when photoService.createPhoto throws error", async () => {
    vi.mocked(photoService.createPhoto).mockRejectedValue(
      new Error("Unexpected error"),
    );

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos/confirm",
      {
        method: "POST",
        body: JSON.stringify({
          userProfileId: userId,
          s3Key,
          s3Bucket,
          bytes: 2500000,
          mime: "image/jpeg",
          imageUrl: `https://${s3Bucket}.s3.amazonaws.com/${s3Key}`,
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error.code).toBe("INTERNAL_ERROR");
  });
});
