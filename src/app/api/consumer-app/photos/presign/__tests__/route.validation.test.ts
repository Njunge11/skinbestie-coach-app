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

describe("POST /api/consumer-app/photos/presign - Validation", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateApiKey).mockResolvedValue(true);
  });

  it("returns 400 when userProfileId is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos/presign",
      {
        method: "POST",
        body: JSON.stringify({
          mime: "image/jpeg",
          extension: "jpg",
          bytes: 2500000,
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when mime type is not allowed", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos/presign",
      {
        method: "POST",
        body: JSON.stringify({
          userProfileId: userId,
          mime: "application/pdf",
          extension: "pdf",
          bytes: 2500000,
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
    expect(data.error.message).toBe("Invalid request body");
    expect(data.error.details).toBeDefined();
    expect(data.error.details[0].message).toContain("Unsupported file type");
  });

  it("returns 400 when file size exceeds limit", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos/presign",
      {
        method: "POST",
        body: JSON.stringify({
          userProfileId: userId,
          mime: "image/jpeg",
          extension: "jpg",
          bytes: 15 * 1024 * 1024, // 15MB (over 10MB limit)
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
    expect(data.error.message).toBe("Invalid request body");
    expect(data.error.details).toBeDefined();
    expect(data.error.details[0].message).toContain("File too large");
  });

  it("returns 400 when MIME type and extension don't match", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos/presign",
      {
        method: "POST",
        body: JSON.stringify({
          userProfileId: userId,
          mime: "image/jpeg",
          extension: "png", // Mismatch!
          bytes: 2500000,
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
    expect(data.error.message).toContain("do not match");
  });

  it("returns 400 when extension is not allowed", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos/presign",
      {
        method: "POST",
        body: JSON.stringify({
          userProfileId: userId,
          mime: "image/jpeg",
          extension: "exe",
          bytes: 2500000,
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
      "http://localhost:3000/api/consumer-app/photos/presign",
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
