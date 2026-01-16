import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../../create-verification-code/route";
import { NextRequest } from "next/server";
import * as authModule from "../../../shared/auth";
import * as serviceModule from "../../auth.service";

// Mock the modules
vi.mock("../../../shared/auth");
vi.mock("../../auth.service");

describe("POST /api/consumer-app/auth/create-verification-code", () => {
  const testIdentifier = "test@example.com";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when API key is invalid", async () => {
    // Given: Invalid API key
    vi.mocked(authModule.validateApiKey).mockResolvedValue(false);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/auth/create-verification-code",
      {
        method: "POST",
        body: JSON.stringify({ identifier: testIdentifier }),
      },
    );

    // When
    const response = await POST(request);

    // Then
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 when identifier is missing", async () => {
    // Given: Valid API key but missing identifier
    vi.mocked(authModule.validateApiKey).mockResolvedValue(true);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/auth/create-verification-code",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );

    // When
    const response = await POST(request);

    // Then
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when identifier format is invalid", async () => {
    // Given: Valid API key but invalid email format
    vi.mocked(authModule.validateApiKey).mockResolvedValue(true);

    const mockService = {
      getUserByEmail: vi.fn(),
      getUserById: vi.fn(),
      createVerificationToken: vi.fn(),
      createVerificationCode: vi.fn().mockResolvedValue({
        success: false,
        error: "Invalid email format",
      }),
      useVerificationToken: vi.fn(),
      verifyCode: vi.fn(),
    };
    vi.mocked(serviceModule.createAuthService).mockReturnValue(mockService);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/auth/create-verification-code",
      {
        method: "POST",
        body: JSON.stringify({ identifier: "not-an-email" }),
      },
    );

    // When
    const response = await POST(request);

    // Then
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 200 with success message when code sent via email", async () => {
    // Given: Valid API key and identifier
    vi.mocked(authModule.validateApiKey).mockResolvedValue(true);

    const mockService = {
      getUserByEmail: vi.fn(),
      getUserById: vi.fn(),
      createVerificationToken: vi.fn(),
      createVerificationCode: vi.fn().mockResolvedValue({
        success: true,
        data: {
          message: "Verification code sent to your email",
          expires: new Date("2025-11-10T14:15:00Z"),
        },
      }),
      useVerificationToken: vi.fn(),
      verifyCode: vi.fn(),
    };
    vi.mocked(serviceModule.createAuthService).mockReturnValue(mockService);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/auth/create-verification-code",
      {
        method: "POST",
        body: JSON.stringify({ identifier: testIdentifier }),
      },
    );

    // When
    const response = await POST(request);

    // Then
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe("Verification code sent to your email");
    expect(body.expires).toBeDefined();
    expect(body.code).toBeUndefined(); // Code should NOT be exposed in response
  });
});
