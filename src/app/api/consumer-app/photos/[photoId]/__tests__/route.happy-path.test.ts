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

describe("GET /api/consumer-app/photos/[photoId] - Happy Path", () => {
  const photoId = "650e8400-e29b-41d4-a716-446655440001";
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateApiKey).mockResolvedValue(true);
  });

  it("returns 200 with photo data when photo exists", async () => {
    const photo = {
      id: photoId,
      userProfileId: userId,
      s3Key: "photos/users/abc/photo1.jpg",
      s3Bucket: "test-bucket",
      bytes: 1000000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/photo1.jpg",
      status: "uploaded",
      weekNumber: 1,
      originalName: "my-photo.jpg",
      width: 1920,
      height: 1080,
      feedback: null,
      uploadedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(photoService.getPhotoById).mockResolvedValue({
      success: true,
      data: photo,
    });

    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/photos/${photoId}?userProfileId=${userId}`,
    );

    const response = await GET(request, {
      params: Promise.resolve({ photoId }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.id).toBe(photoId);
    expect(data.data.userProfileId).toBe(userId);
  });
});
