import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

// Mock the server actions module
vi.mock("@/app/(dashboard)/subscribers/actions", () => ({
  getUserProfileByEmail: vi.fn(),
}));

// Mock the auth module
vi.mock("../auth", () => ({
  validateApiKey: vi.fn(),
}));

import { getUserProfileByEmail } from "@/app/(dashboard)/subscribers/actions";
import { validateApiKey } from "../auth";

describe("GET /api/user-profiles/by-email", () => {
  const validApiKey = "test-api-key-123";
  const baseUrl = "http://localhost:3000";
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_KEY = validApiKey;
  });

  describe("Authentication", () => {
    it("returns 401 when API key is missing", async () => {
      // Given: request without API key
      const mockAuthError = Response.json(
        { error: "Unauthorized - Invalid or missing API key" },
        { status: 401 }
      );
      vi.mocked(validateApiKey).mockReturnValue(mockAuthError);

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/by-email?email=john@example.com`,
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
      expect(getUserProfileByEmail).not.toHaveBeenCalled();
    });
  });

  describe("Success Cases", () => {
    it("returns user profile when found by email", async () => {
      // Given: valid request with API key and email
      vi.mocked(validateApiKey).mockReturnValue(null);

      const userData = {
        id: userId,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
        skinType: ["oily"],
        concerns: ["acne"],
        hasAllergies: false,
        allergyDetails: null,
        isSubscribed: true,
        hasCompletedBooking: true,
        completedSteps: ["PERSONAL", "SKIN_TYPE", "SKIN_CONCERNS"],
        isCompleted: false,
        completedAt: null,
        createdAt: new Date("2025-01-15T10:00:00Z"),
        updatedAt: new Date("2025-01-15T10:00:00Z"),
      };

      vi.mocked(getUserProfileByEmail).mockResolvedValue({
        success: true,
        data: userData,
      });

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/by-email?email=john@example.com`,
        {
          method: "GET",
          headers: {
            "x-api-key": validApiKey,
          },
        }
      );

      // When: calling GET handler
      const response = await GET(request);

      // Then: returns 200 with user data
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(userId);
      expect(data.firstName).toBe("John");
      expect(data.email).toBe("john@example.com");
      expect(getUserProfileByEmail).toHaveBeenCalledWith("john@example.com");
    });

    it("handles email with URL encoding", async () => {
      // Given: valid request with URL-encoded email
      vi.mocked(validateApiKey).mockReturnValue(null);

      const userData = {
        id: userId,
        firstName: "John",
        lastName: "Doe",
        email: "john+test@example.com",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
        skinType: null,
        concerns: null,
        hasAllergies: null,
        allergyDetails: null,
        isSubscribed: null,
        hasCompletedBooking: null,
        completedSteps: ["PERSONAL"],
        isCompleted: false,
        completedAt: null,
        createdAt: new Date("2025-01-15T10:00:00Z"),
        updatedAt: new Date("2025-01-15T10:00:00Z"),
      };

      vi.mocked(getUserProfileByEmail).mockResolvedValue({
        success: true,
        data: userData,
      });

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/by-email?email=${encodeURIComponent(
          "john+test@example.com"
        )}`,
        {
          method: "GET",
          headers: {
            "x-api-key": validApiKey,
          },
        }
      );

      // When: calling GET handler
      const response = await GET(request);

      // Then: returns 200 with user data
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.email).toBe("john+test@example.com");
      expect(getUserProfileByEmail).toHaveBeenCalledWith(
        "john+test@example.com"
      );
    });
  });

  describe("Error Cases", () => {
    it("returns 400 when email parameter is missing", async () => {
      // Given: request without email parameter
      vi.mocked(validateApiKey).mockReturnValue(null);

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/by-email`,
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
      expect(data.error).toBe("Email parameter is required");
      expect(getUserProfileByEmail).not.toHaveBeenCalled();
    });

    it("returns 404 when user not found", async () => {
      // Given: server action returns not found error
      vi.mocked(validateApiKey).mockReturnValue(null);
      vi.mocked(getUserProfileByEmail).mockResolvedValue({
        success: false,
        error: "Profile not found",
      });

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/by-email?email=nonexistent@example.com`,
        {
          method: "GET",
          headers: {
            "x-api-key": validApiKey,
          },
        }
      );

      // When: calling GET handler
      const response = await GET(request);

      // Then: returns 404
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Profile not found");
    });

    it("returns 500 for internal server errors", async () => {
      // Given: request throws unexpected error
      vi.mocked(validateApiKey).mockReturnValue(null);
      vi.mocked(getUserProfileByEmail).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/by-email?email=john@example.com`,
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
  });
});
