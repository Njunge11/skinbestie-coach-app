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

describe("POST /api/consumer-app/photos/confirm - Validation", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const photoId = "650e8400-e29b-41d4-a716-446655440001";
  const s3Key = `photos/users/${userId}/2025-11-04/${photoId}.jpg`;
  const s3Bucket = "test-bucket";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateApiKey).mockResolvedValue(true);
  });

  it("returns 400 when userProfileId is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos/confirm",
      {
        method: "POST",
        body: JSON.stringify({
          photoId,
          s3Key,
          s3Bucket,
          bytes: 2500000,
          mime: "image/jpeg",
          imageUrl: `https://${s3Bucket}.s3.amazonaws.com/${s3Key}`,
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when s3Key is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos/confirm",
      {
        method: "POST",
        body: JSON.stringify({
          userProfileId: userId,
          photoId,
          s3Bucket,
          bytes: 2500000,
          mime: "image/jpeg",
          imageUrl: `https://${s3Bucket}.s3.amazonaws.com/${s3Key}`,
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when s3Bucket is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos/confirm",
      {
        method: "POST",
        body: JSON.stringify({
          userProfileId: userId,
          photoId,
          s3Key,
          bytes: 2500000,
          mime: "image/jpeg",
          imageUrl: `https://${s3Bucket}.s3.amazonaws.com/${s3Key}`,
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when bytes is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos/confirm",
      {
        method: "POST",
        body: JSON.stringify({
          userProfileId: userId,
          photoId,
          s3Key,
          s3Bucket,
          mime: "image/jpeg",
          imageUrl: `https://${s3Bucket}.s3.amazonaws.com/${s3Key}`,
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when mime is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos/confirm",
      {
        method: "POST",
        body: JSON.stringify({
          userProfileId: userId,
          photoId,
          s3Key,
          s3Bucket,
          bytes: 2500000,
          imageUrl: `https://${s3Bucket}.s3.amazonaws.com/${s3Key}`,
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when imageUrl is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos/confirm",
      {
        method: "POST",
        body: JSON.stringify({
          userProfileId: userId,
          photoId,
          s3Key,
          s3Bucket,
          bytes: 2500000,
          mime: "image/jpeg",
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when request body is invalid JSON", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos/confirm",
      {
        method: "POST",
        body: "invalid json",
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });
});
