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

vi.mock("@/lib/services/storage.service", () => ({
  storageService: {
    generatePresignedUploadUrl: vi.fn(),
  },
}));

import { validateApiKey } from "../../../shared/auth";
import { storageService } from "@/lib/services/storage.service";

describe("POST /api/consumer-app/photos/presign - Happy Path", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const photoId = "650e8400-e29b-41d4-a716-446655440001";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateApiKey).mockResolvedValue(true);
  });

  it("returns 200 with presigned URL for JPEG", async () => {
    vi.mocked(storageService.generatePresignedUploadUrl).mockResolvedValue({
      uploadUrl: "https://s3.amazonaws.com/bucket/key?signature=xyz",
      s3Key: `photos/users/${userId}/2025-11-03/${photoId}.jpg`,
      photoId,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos/presign",
      {
        method: "POST",
        body: JSON.stringify({
          userProfileId: userId,
          mime: "image/jpeg",
          extension: "jpg",
          bytes: 2500000,
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.uploadUrl).toContain("s3.amazonaws.com");
    expect(data.data.s3Key).toContain(`photos/users/${userId}`);
    expect(data.data.photoId).toBe(photoId);
    expect(data.data.expiresIn).toBe(60);
  });

  it("returns presigned URL for PNG", async () => {
    vi.mocked(storageService.generatePresignedUploadUrl).mockResolvedValue({
      uploadUrl: "https://s3.amazonaws.com/bucket/key?signature=xyz",
      s3Key: `photos/users/${userId}/2025-11-03/${photoId}.png`,
      photoId,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos/presign",
      {
        method: "POST",
        body: JSON.stringify({
          userProfileId: userId,
          mime: "image/png",
          extension: "png",
          bytes: 3000000,
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.s3Key).toContain(".png");
  });

  it("returns presigned URL for HEIC", async () => {
    vi.mocked(storageService.generatePresignedUploadUrl).mockResolvedValue({
      uploadUrl: "https://s3.amazonaws.com/bucket/key?signature=xyz",
      s3Key: `photos/users/${userId}/2025-11-03/${photoId}.heic`,
      photoId,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos/presign",
      {
        method: "POST",
        body: JSON.stringify({
          userProfileId: userId,
          mime: "image/heic",
          extension: "heic",
          bytes: 4000000,
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.s3Key).toContain(".heic");
  });
});
