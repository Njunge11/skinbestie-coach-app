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

describe("GET /api/consumer-app/photos - Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when API key is missing", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(false);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos?userProfileId=550e8400-e29b-41d4-a716-446655440000",
    );

    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when API key is invalid", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(false);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos?userProfileId=550e8400-e29b-41d4-a716-446655440000",
      {
        headers: {
          "x-api-key": "invalid-key",
        },
      },
    );

    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error.code).toBe("UNAUTHORIZED");
  });
});
