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

describe("POST /api/consumer-app/photos/presign - Error Cases", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateApiKey).mockResolvedValue(true);
  });

  it("returns 500 when storage service throws error", async () => {
    vi.mocked(storageService.generatePresignedUploadUrl).mockRejectedValue(
      new Error("S3 connection failed"),
    );

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

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error.code).toBe("INTERNAL_ERROR");
  });
});
