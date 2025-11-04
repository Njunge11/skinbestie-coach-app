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
vi.mock("../../shared/auth", () => ({
  validateApiKey: vi.fn(),
}));

vi.mock("@/lib/services/photo.service", () => ({
  photoService: {
    listPhotos: vi.fn(),
  },
}));

import { validateApiKey } from "../../shared/auth";
import { photoService } from "@/lib/services/photo.service";

describe("GET /api/consumer-app/photos - Happy Path", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateApiKey).mockResolvedValue(true);
  });

  it("returns 200 with list of photos", async () => {
    const photos = [
      {
        id: "photo-1",
        userProfileId: userId,
        s3Key: "photos/users/abc/photo1.jpg",
        s3Bucket: "test-bucket",
        bytes: 1000000,
        mime: "image/jpeg",
        imageUrl: "https://s3.amazonaws.com/photo1.jpg",
        status: "uploaded",
        weekNumber: null,
        originalName: null,
        width: null,
        height: null,
        feedback: null,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "photo-2",
        userProfileId: userId,
        s3Key: "photos/users/abc/photo2.jpg",
        s3Bucket: "test-bucket",
        bytes: 2000000,
        mime: "image/png",
        imageUrl: "https://s3.amazonaws.com/photo2.jpg",
        status: "uploaded",
        weekNumber: 1,
        originalName: "my-photo.png",
        width: 1920,
        height: 1080,
        feedback: null,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(photoService.listPhotos).mockResolvedValue({
      success: true,
      data: photos,
    });

    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/photos?userProfileId=${userId}`,
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.data[0].id).toBe("photo-1");
    expect(data.data[1].id).toBe("photo-2");
  });

  it("uses default limit and offset when not provided", async () => {
    vi.mocked(photoService.listPhotos).mockResolvedValue({
      success: true,
      data: [],
    });

    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/photos?userProfileId=${userId}`,
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual([]);
  });

  it("accepts custom limit and offset", async () => {
    vi.mocked(photoService.listPhotos).mockResolvedValue({
      success: true,
      data: [],
    });

    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/photos?userProfileId=${userId}&limit=10&offset=5`,
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual([]);
  });

  it("accepts weekNumber filter", async () => {
    vi.mocked(photoService.listPhotos).mockResolvedValue({
      success: true,
      data: [],
    });

    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/photos?userProfileId=${userId}&weekNumber=3`,
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual([]);
  });

  it("returns empty array when no photos found", async () => {
    vi.mocked(photoService.listPhotos).mockResolvedValue({
      success: true,
      data: [],
    });

    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/photos?userProfileId=${userId}`,
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual([]);
  });
});
