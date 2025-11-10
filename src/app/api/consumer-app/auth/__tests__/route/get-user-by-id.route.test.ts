import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "../../user/[id]/route";
import { NextRequest } from "next/server";
import * as authModule from "../../../shared/auth";
import * as serviceModule from "../../auth.service";

// Mock the modules
vi.mock("../../../shared/auth");
vi.mock("../../auth.service");

describe("GET /api/consumer-app/auth/user/[id]", () => {
  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testUserEmail = "test@example.com";
  const testProfileId = "660e8400-e29b-41d4-a716-446655440001";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when API key is invalid", async () => {
    // Given: Invalid API key
    vi.mocked(authModule.validateApiKey).mockResolvedValue(false);

    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/auth/user/${testUserId}`,
      {
        method: "GET",
      },
    );

    // When
    const response = await GET(request, {
      params: Promise.resolve({ id: testUserId }),
    });

    // Then
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 when user ID is invalid UUID format", async () => {
    // Given: Valid API key but invalid UUID in params
    vi.mocked(authModule.validateApiKey).mockResolvedValue(true);

    const mockService = {
      getUserByEmail: vi.fn(),
      getUserById: vi.fn().mockResolvedValue({
        success: false,
        error: "Invalid user ID format",
      }),
      createVerificationToken: vi.fn(),
      useVerificationToken: vi.fn(),
      createVerificationCode: vi.fn(),
      verifyCode: vi.fn(),
    };
    vi.mocked(serviceModule.createAuthService).mockReturnValue(mockService);

    const invalidId = "not-a-uuid";
    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/auth/user/${invalidId}`,
      {
        method: "GET",
      },
    );

    // When
    const response = await GET(request, {
      params: Promise.resolve({ id: invalidId }),
    });

    // Then
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 404 when user does not exist", async () => {
    // Given: Valid API key and UUID, but service returns not found
    vi.mocked(authModule.validateApiKey).mockResolvedValue(true);

    const mockService = {
      getUserByEmail: vi.fn(),
      getUserById: vi.fn().mockResolvedValue({
        success: false,
        error: "User not found",
      }),
      createVerificationToken: vi.fn(),
      useVerificationToken: vi.fn(),
      createVerificationCode: vi.fn(),
      verifyCode: vi.fn(),
    };
    vi.mocked(serviceModule.createAuthService).mockReturnValue(mockService);

    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/auth/user/${testUserId}`,
      {
        method: "GET",
      },
    );

    // When
    const response = await GET(request, {
      params: Promise.resolve({ id: testUserId }),
    });

    // Then
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 200 with user data when user exists with complete onboarding", async () => {
    // Given: Valid API key, service returns user with onboardingComplete=true
    vi.mocked(authModule.validateApiKey).mockResolvedValue(true);

    const mockService = {
      getUserByEmail: vi.fn(),
      getUserById: vi.fn().mockResolvedValue({
        success: true,
        data: {
          user: {
            id: testUserId,
            email: testUserEmail,
            emailVerified: new Date("2025-01-01"),
            name: "Test User",
            image: null,
          },
          profile: {
            id: testProfileId,
            userId: testUserId,
            email: testUserEmail,
            firstName: "Test",
            lastName: "User",
            phoneNumber: "+1234567890",
            dateOfBirth: new Date("1990-01-01"),
            onboardingComplete: true,
          },
        },
      }),
      createVerificationToken: vi.fn(),
      useVerificationToken: vi.fn(),
      createVerificationCode: vi.fn(),
      verifyCode: vi.fn(),
    };
    vi.mocked(serviceModule.createAuthService).mockReturnValue(mockService);

    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/auth/user/${testUserId}`,
      {
        method: "GET",
      },
    );

    // When
    const response = await GET(request, {
      params: Promise.resolve({ id: testUserId }),
    });

    // Then
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user.id).toBe(testUserId);
    expect(body.user.email).toBe(testUserEmail);
    expect(body.profile).not.toBeNull();
    expect(body.profile.onboardingComplete).toBe(true);
  });

  it("returns 200 with user data when user exists with incomplete onboarding", async () => {
    // Given: Valid API key, service returns user with onboardingComplete=false
    vi.mocked(authModule.validateApiKey).mockResolvedValue(true);

    const mockService = {
      getUserByEmail: vi.fn(),
      getUserById: vi.fn().mockResolvedValue({
        success: true,
        data: {
          user: {
            id: testUserId,
            email: testUserEmail,
            emailVerified: new Date("2025-01-01"),
            name: "Test User",
            image: null,
          },
          profile: {
            id: testProfileId,
            userId: testUserId,
            email: testUserEmail,
            firstName: "Test",
            lastName: "User",
            phoneNumber: "+1234567890",
            dateOfBirth: new Date("1990-01-01"),
            onboardingComplete: false,
          },
        },
      }),
      createVerificationToken: vi.fn(),
      useVerificationToken: vi.fn(),
      createVerificationCode: vi.fn(),
      verifyCode: vi.fn(),
    };
    vi.mocked(serviceModule.createAuthService).mockReturnValue(mockService);

    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/auth/user/${testUserId}`,
      {
        method: "GET",
      },
    );

    // When
    const response = await GET(request, {
      params: Promise.resolve({ id: testUserId }),
    });

    // Then
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.profile.onboardingComplete).toBe(false);
  });

  it("returns 500 when service throws unexpected error", async () => {
    // Given: Valid API key but service error
    vi.mocked(authModule.validateApiKey).mockResolvedValue(true);

    const mockService = {
      getUserByEmail: vi.fn(),
      getUserById: vi.fn().mockResolvedValue({
        success: false,
        error: "Failed to retrieve user",
      }),
      createVerificationToken: vi.fn(),
      useVerificationToken: vi.fn(),
      createVerificationCode: vi.fn(),
      verifyCode: vi.fn(),
    };
    vi.mocked(serviceModule.createAuthService).mockReturnValue(mockService);

    const request = new NextRequest(
      `http://localhost:3000/api/consumer-app/auth/user/${testUserId}`,
      {
        method: "GET",
      },
    );

    // When
    const response = await GET(request, {
      params: Promise.resolve({ id: testUserId }),
    });

    // Then
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});
