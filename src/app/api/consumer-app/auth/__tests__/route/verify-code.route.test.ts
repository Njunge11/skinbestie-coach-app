import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../../verify-code/route";
import { NextRequest } from "next/server";
import * as authModule from "../../../shared/auth";
import * as serviceModule from "../../auth.service";

// Mock the modules
vi.mock("../../../shared/auth");
vi.mock("../../auth.service");

describe("POST /api/consumer-app/auth/verify-code", () => {
  const testIdentifier = "test@example.com";
  const testCode = "123456";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when API key is invalid", async () => {
    // Given: Invalid API key
    vi.mocked(authModule.validateApiKey).mockResolvedValue(false);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/auth/verify-code",
      {
        method: "POST",
        body: JSON.stringify({ identifier: testIdentifier, code: testCode }),
      },
    );

    // When
    const response = await POST(request);

    // Then
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 when identifier or code is missing", async () => {
    // Given: Valid API key but missing identifier/code
    vi.mocked(authModule.validateApiKey).mockResolvedValue(true);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/auth/verify-code",
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

  it("returns 400 when request body is invalid JSON", async () => {
    // Given: Valid API key but malformed JSON
    vi.mocked(authModule.validateApiKey).mockResolvedValue(true);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/auth/verify-code",
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

  it("returns 200 when code is valid and consumed", async () => {
    // Given: Valid API key, identifier, and correct code
    vi.mocked(authModule.validateApiKey).mockResolvedValue(true);

    const mockService = {
      getUserByEmail: vi.fn(),
      getUserById: vi.fn(),
      createVerificationToken: vi.fn(),
      createVerificationCode: vi.fn(),
      useVerificationToken: vi.fn(),
      verifyCode: vi.fn().mockResolvedValue({
        success: true,
        data: {
          identifier: testIdentifier,
        },
      }),
    };
    vi.mocked(serviceModule.createAuthService).mockReturnValue(mockService);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/auth/verify-code",
      {
        method: "POST",
        body: JSON.stringify({ identifier: testIdentifier, code: testCode }),
      },
    );

    // When
    const response = await POST(request);

    // Then
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.identifier).toBe(testIdentifier);
  });

  it("returns 404 when code is invalid or expired", async () => {
    // Given: Valid API key but wrong/expired code
    vi.mocked(authModule.validateApiKey).mockResolvedValue(true);

    const mockService = {
      getUserByEmail: vi.fn(),
      getUserById: vi.fn(),
      createVerificationToken: vi.fn(),
      createVerificationCode: vi.fn(),
      useVerificationToken: vi.fn(),
      verifyCode: vi.fn().mockResolvedValue({
        success: false,
        error: "Invalid or expired code",
      }),
    };
    vi.mocked(serviceModule.createAuthService).mockReturnValue(mockService);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/auth/verify-code",
      {
        method: "POST",
        body: JSON.stringify({ identifier: testIdentifier, code: "999999" }),
      },
    );

    // When
    const response = await POST(request);

    // Then
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 500 when service throws unexpected error", async () => {
    // Given: Valid API key but service error
    vi.mocked(authModule.validateApiKey).mockResolvedValue(true);

    const mockService = {
      getUserByEmail: vi.fn(),
      getUserById: vi.fn(),
      createVerificationToken: vi.fn(),
      createVerificationCode: vi.fn(),
      useVerificationToken: vi.fn(),
      verifyCode: vi.fn().mockResolvedValue({
        success: false,
        error: "Failed to verify code",
      }),
    };
    vi.mocked(serviceModule.createAuthService).mockReturnValue(mockService);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/auth/verify-code",
      {
        method: "POST",
        body: JSON.stringify({ identifier: testIdentifier, code: testCode }),
      },
    );

    // When
    const response = await POST(request);

    // Then
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});
