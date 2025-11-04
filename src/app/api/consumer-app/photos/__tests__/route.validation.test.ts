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

describe("GET /api/consumer-app/photos - Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateApiKey).mockResolvedValue(true);
  });

  it("returns 400 when userProfileId is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos",
    );

    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when userProfileId is invalid UUID", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos?userProfileId=invalid-uuid",
    );

    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when limit is not a number", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos?userProfileId=550e8400-e29b-41d4-a716-446655440000&limit=abc",
    );

    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when offset is not a number", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos?userProfileId=550e8400-e29b-41d4-a716-446655440000&offset=abc",
    );

    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when weekNumber is not a number", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/photos?userProfileId=550e8400-e29b-41d4-a716-446655440000&weekNumber=abc",
    );

    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });
});
