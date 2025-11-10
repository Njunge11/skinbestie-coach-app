import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../../use-verification-token/route";
import { NextRequest } from "next/server";
import * as authModule from "../../../shared/auth";
import * as serviceModule from "../../auth.service";

// Mock the modules
vi.mock("../../../shared/auth");
vi.mock("../../auth.service");

describe("POST /api/consumer-app/auth/use-verification-token", () => {
  const testIdentifier = "test@example.com";
  const testToken = "abc123def456";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when API key is invalid", async () => {
    // Given: Invalid API key
    vi.mocked(authModule.validateApiKey).mockResolvedValue(false);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/auth/use-verification-token",
      {
        method: "POST",
        body: JSON.stringify({ identifier: testIdentifier, token: testToken }),
      },
    );

    // When
    const response = await POST(request);

    // Then
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 when request body is invalid JSON", async () => {
    // Given: Valid API key but malformed JSON
    vi.mocked(authModule.validateApiKey).mockResolvedValue(true);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/auth/use-verification-token",
      {
        method: "POST",
        body: "invalid json{",
      },
    );

    // When
    const response = await POST(request);

    // Then
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when identifier is missing", async () => {
    // Given: Valid API key but missing identifier
    vi.mocked(authModule.validateApiKey).mockResolvedValue(true);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/auth/use-verification-token",
      {
        method: "POST",
        body: JSON.stringify({ token: testToken }),
      },
    );

    // When
    const response = await POST(request);

    // Then
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when token is missing", async () => {
    // Given: Valid API key but missing token
    vi.mocked(authModule.validateApiKey).mockResolvedValue(true);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/auth/use-verification-token",
      {
        method: "POST",
        body: JSON.stringify({ identifier: testIdentifier }),
      },
    );

    // When
    const response = await POST(request);

    // Then
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 200 when token is valid and consumed", async () => {
    // Given: Valid API key and valid token
    vi.mocked(authModule.validateApiKey).mockResolvedValue(true);

    const mockService = {
      getUserByEmail: vi.fn(),
      getUserById: vi.fn(),
      createVerificationToken: vi.fn(),
      createVerificationCode: vi.fn(),
      useVerificationToken: vi.fn().mockResolvedValue({
        success: true,
        data: {
          identifier: testIdentifier,
        },
      }),
      verifyCode: vi.fn(),
    };
    vi.mocked(serviceModule.createAuthService).mockReturnValue(mockService);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/auth/use-verification-token",
      {
        method: "POST",
        body: JSON.stringify({ identifier: testIdentifier, token: testToken }),
      },
    );

    // When
    const response = await POST(request);

    // Then
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.identifier).toBe(testIdentifier);
  });

  it("returns 404 when token is invalid/used/expired", async () => {
    // Given: Valid API key but invalid token
    vi.mocked(authModule.validateApiKey).mockResolvedValue(true);

    const mockService = {
      getUserByEmail: vi.fn(),
      getUserById: vi.fn(),
      createVerificationToken: vi.fn(),
      createVerificationCode: vi.fn(),
      useVerificationToken: vi.fn().mockResolvedValue({
        success: false,
        error: "Invalid or expired token",
      }),
      verifyCode: vi.fn(),
    };
    vi.mocked(serviceModule.createAuthService).mockReturnValue(mockService);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/auth/use-verification-token",
      {
        method: "POST",
        body: JSON.stringify({ identifier: testIdentifier, token: testToken }),
      },
    );

    // When
    const response = await POST(request);

    // Then
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
