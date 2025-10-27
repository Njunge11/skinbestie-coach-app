import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET } from "./route";

// Mock the server actions module
vi.mock("@/app/(dashboard)/subscribers/actions", () => ({
  checkUserProfileExists: vi.fn(),
}));

// Mock the auth module
vi.mock("../../auth", () => ({
  validateApiKey: vi.fn(),
}));

import { checkUserProfileExists } from "@/app/(dashboard)/subscribers/actions";
import { validateApiKey } from "../../auth";

describe("GET /api/user-profiles/check", () => {
  const validApiKey = "test-api-key-123";
  const baseUrl = "http://localhost:3000";

  const mockUserProfile = {
    id: "user-123",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phoneNumber: "+1234567890",
    dateOfBirth: new Date("1990-01-01"),
    skinType: ["oily"],
    concerns: ["acne"],
    hasAllergies: false,
    allergyDetails: null,
    occupation: null,
    bio: null,
    timezone: "UTC",
    isSubscribed: true,
    hasCompletedBooking: true,
    completedSteps: ["PERSONAL"],
    isCompleted: false,
    completedAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_KEY = validApiKey;
  });

  describe("Authentication", () => {
    it("returns 401 when API key is missing", async () => {
      // Given: request without API key
      const mockAuthError = NextResponse.json(
        { error: "Unauthorized - Invalid or missing API key" },
        { status: 401 }
      );
      vi.mocked(validateApiKey).mockReturnValue(mockAuthError);

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/check?email=john@example.com`,
        {
          method: "GET",
        }
      );

      // When: calling GET handler
      const response = await GET(request);

      // Then: returns 401
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized - Invalid or missing API key");
      expect(checkUserProfileExists).not.toHaveBeenCalled();
    });
  });

  describe("Success Cases", () => {
    it("returns exists: true when user found by email", async () => {
      // Given: valid request with API key and email
      vi.mocked(validateApiKey).mockReturnValue(null);
      vi.mocked(checkUserProfileExists).mockResolvedValue({
        success: true,
        data: { exists: true, profile: mockUserProfile },
      });

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/check?email=john@example.com`,
        {
          method: "GET",
          headers: {
            "x-api-key": validApiKey,
          },
        }
      );

      // When: calling GET handler
      const response = await GET(request);

      // Then: returns 200 with exists: true
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.exists).toBe(true);
      expect(checkUserProfileExists).toHaveBeenCalledWith({
        email: "john@example.com",
        phoneNumber: undefined,
      });
    });

    it("returns exists: false when user not found by email", async () => {
      // Given: valid request with email that doesn't exist
      vi.mocked(validateApiKey).mockReturnValue(null);
      vi.mocked(checkUserProfileExists).mockResolvedValue({
        success: true,
        data: { exists: false, profile: null },
      } as unknown as Awaited<ReturnType<typeof checkUserProfileExists>>);

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/check?email=nonexistent@example.com`,
        {
          method: "GET",
          headers: {
            "x-api-key": validApiKey,
          },
        }
      );

      // When: calling GET handler
      const response = await GET(request);

      // Then: returns 200 with exists: false
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.exists).toBe(false);
    });

    it("returns exists: true when user found by phone number", async () => {
      // Given: valid request with phone number
      vi.mocked(validateApiKey).mockReturnValue(null);
      vi.mocked(checkUserProfileExists).mockResolvedValue({
        success: true,
        data: { exists: true, profile: mockUserProfile },
      });

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/check?phoneNumber=%2B1234567890`,
        {
          method: "GET",
          headers: {
            "x-api-key": validApiKey,
          },
        }
      );

      // When: calling GET handler
      const response = await GET(request);

      // Then: returns 200 with exists: true
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.exists).toBe(true);
      expect(checkUserProfileExists).toHaveBeenCalledWith({
        email: undefined,
        phoneNumber: "+1234567890",
      });
    });

    it("checks both email and phone number when both provided", async () => {
      // Given: request with both email and phone number
      vi.mocked(validateApiKey).mockReturnValue(null);
      vi.mocked(checkUserProfileExists).mockResolvedValue({
        success: true,
        data: { exists: true, profile: mockUserProfile },
      });

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/check?email=john@example.com&phoneNumber=%2B1234567890`,
        {
          method: "GET",
          headers: {
            "x-api-key": validApiKey,
          },
        }
      );

      // When: calling GET handler
      const response = await GET(request);

      // Then: returns 200 and calls action with both parameters
      expect(response.status).toBe(200);
      expect(checkUserProfileExists).toHaveBeenCalledWith({
        email: "john@example.com",
        phoneNumber: "+1234567890",
      });
    });
  });

  describe("Error Cases", () => {
    it("returns 400 when neither email nor phoneNumber is provided", async () => {
      // Given: request without email or phoneNumber
      vi.mocked(validateApiKey).mockReturnValue(null);

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/check`,
        {
          method: "GET",
          headers: {
            "x-api-key": validApiKey,
          },
        }
      );

      // When: calling GET handler
      const response = await GET(request);

      // Then: returns 400
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Either email or phoneNumber parameter is required");
      expect(checkUserProfileExists).not.toHaveBeenCalled();
    });

    it("returns 400 for validation errors from server action", async () => {
      // Given: server action returns validation error
      vi.mocked(validateApiKey).mockReturnValue(null);
      vi.mocked(checkUserProfileExists).mockResolvedValue({
        success: false,
        error: "Invalid email format",
      });

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/check?email=invalid-email`,
        {
          method: "GET",
          headers: {
            "x-api-key": validApiKey,
          },
        }
      );

      // When: calling GET handler
      const response = await GET(request);

      // Then: returns 400
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid email format");
    });

    it("returns 500 for internal server errors", async () => {
      // Given: request throws unexpected error
      vi.mocked(validateApiKey).mockReturnValue(null);
      vi.mocked(checkUserProfileExists).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/check?email=john@example.com`,
        {
          method: "GET",
          headers: {
            "x-api-key": validApiKey,
          },
        }
      );

      // When: calling GET handler
      const response = await GET(request);

      // Then: returns 500
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Internal server error");
    });

    it("handles URL-encoded email parameter correctly", async () => {
      // Given: request with URL-encoded email
      vi.mocked(validateApiKey).mockReturnValue(null);
      vi.mocked(checkUserProfileExists).mockResolvedValue({
        success: true,
        data: { exists: true, profile: mockUserProfile },
      });

      const email = "john+test@example.com";
      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/check?email=${encodeURIComponent(email)}`,
        {
          method: "GET",
          headers: {
            "x-api-key": validApiKey,
          },
        }
      );

      // When: calling GET handler
      const response = await GET(request);

      // Then: decodes email correctly
      expect(response.status).toBe(200);
      expect(checkUserProfileExists).toHaveBeenCalledWith({
        email: "john+test@example.com",
        phoneNumber: undefined,
      });
    });
  });
});
