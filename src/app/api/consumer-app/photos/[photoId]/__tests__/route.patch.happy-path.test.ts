import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "../route";
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
    updatePhoto: vi.fn(),
  },
}));

import { validateApiKey } from "../../../shared/auth";
import { photoService } from "@/lib/services/photo.service";

describe("PATCH /api/consumer-app/photos/[photoId] - Happy Path", () => {
  const photoId = "650e8400-e29b-41d4-a716-446655440001";
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateApiKey).mockResolvedValue(true);
  });

  it("updates weekNumber successfully", async () => {
    const updatedPhoto = {
      id: photoId,
      userProfileId: userId,
      s3Key: "photos/users/abc/photo1.jpg",
      s3Bucket: "test-bucket",
      bytes: 1000000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/photo1.jpg",
      status: "uploaded",
      weekNumber: 2,
      originalName: "my-photo.jpg",
      width: 1920,
      height: 1080,
      feedback: null,
      uploadedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(photoService.updatePhoto).mockResolvedValue({
      success: true,
      data: updatedPhoto,
    });

    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/photos/${photoId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          userProfileId: userId,
          weekNumber: 2,
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ photoId }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.weekNumber).toBe(2);
  });

  it("updates feedback successfully", async () => {
    const updatedPhoto = {
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
      feedback: "Great progress!",
      uploadedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(photoService.updatePhoto).mockResolvedValue({
      success: true,
      data: updatedPhoto,
    });

    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/photos/${photoId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          userProfileId: userId,
          feedback: "Great progress!",
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ photoId }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.feedback).toBe("Great progress!");
  });

  it("updates multiple fields successfully", async () => {
    const updatedPhoto = {
      id: photoId,
      userProfileId: userId,
      s3Key: "photos/users/abc/photo1.jpg",
      s3Bucket: "test-bucket",
      bytes: 1000000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/photo1.jpg",
      status: "uploaded",
      weekNumber: 3,
      originalName: "my-photo.jpg",
      width: 1920,
      height: 1080,
      feedback: "Looking good!",
      uploadedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(photoService.updatePhoto).mockResolvedValue({
      success: true,
      data: updatedPhoto,
    });

    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/photos/${photoId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          userProfileId: userId,
          weekNumber: 3,
          feedback: "Looking good!",
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ photoId }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.weekNumber).toBe(3);
    expect(data.data.feedback).toBe("Looking good!");
  });
});
