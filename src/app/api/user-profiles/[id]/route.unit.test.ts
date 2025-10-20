import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "./route";

// Mock the server actions module
vi.mock("@/app/(dashboard)/subscribers/actions", () => ({
  getUserProfileById: vi.fn(),
  updateUserProfile: vi.fn(),
}));

// Mock the auth module
vi.mock("../../auth", () => ({
  validateApiKey: vi.fn(),
}));

import {
  getUserProfileById,
  updateUserProfile,
} from "@/app/(dashboard)/subscribers/actions";
import { validateApiKey } from "../../auth";

describe("GET /api/user-profiles/[id]", () => {
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
        `${baseUrl}/api/user-profiles/${userId}`,
        {
          method: "GET",
        }
      );

      // When: calling GET handler
      const response = await GET(request, { params: { id: userId } });

      // Then: returns 401
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized - Invalid or missing API key");
      expect(getUserProfileById).not.toHaveBeenCalled();
    });
  });

  describe("Success Cases", () => {
    it("returns user profile when found", async () => {
      // Given: valid request with API key
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

      vi.mocked(getUserProfileById).mockResolvedValue({
        success: true,
        data: userData,
      });

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/${userId}`,
        {
          method: "GET",
          headers: {
            "x-api-key": validApiKey,
          },
        }
      );

      // When: calling GET handler
      const response = await GET(request, { params: { id: userId } });

      // Then: returns 200 with user data
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(userId);
      expect(data.firstName).toBe("John");
      expect(data.email).toBe("john@example.com");
      expect(getUserProfileById).toHaveBeenCalledWith(userId);
    });
  });

  describe("Error Cases", () => {
    it("returns 404 when user not found", async () => {
      // Given: server action returns not found error
      vi.mocked(validateApiKey).mockReturnValue(null);
      vi.mocked(getUserProfileById).mockResolvedValue({
        success: false,
        error: "Profile not found",
      });

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/${userId}`,
        {
          method: "GET",
          headers: {
            "x-api-key": validApiKey,
          },
        }
      );

      // When: calling GET handler
      const response = await GET(request, { params: { id: userId } });

      // Then: returns 404
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Profile not found");
    });

    it("returns 500 for internal server errors", async () => {
      // Given: request throws unexpected error
      vi.mocked(validateApiKey).mockReturnValue(null);
      vi.mocked(getUserProfileById).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/${userId}`,
        {
          method: "GET",
          headers: {
            "x-api-key": validApiKey,
          },
        }
      );

      // When: calling GET handler
      const response = await GET(request, { params: { id: userId } });

      // Then: returns 500
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Internal server error");
    });
  });
});

describe("PATCH /api/user-profiles/[id]", () => {
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
        `${baseUrl}/api/user-profiles/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            skinType: ["dry"],
          }),
        }
      );

      // When: calling PATCH handler
      const response = await PATCH(request, { params: { id: userId } });

      // Then: returns 401
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized - Invalid or missing API key");
      expect(updateUserProfile).not.toHaveBeenCalled();
    });
  });

  describe("Success Cases", () => {
    it("updates user profile successfully", async () => {
      // Given: valid request with API key
      vi.mocked(validateApiKey).mockReturnValue(null);

      const updatedUser = {
        id: userId,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
        skinType: ["dry", "sensitive"],
        concerns: ["wrinkles"],
        hasAllergies: true,
        allergyDetails: "Fragrance allergies",
        isSubscribed: true,
        hasCompletedBooking: true,
        completedSteps: [
          "PERSONAL",
          "SKIN_TYPE",
          "SKIN_CONCERNS",
          "ALLERGIES",
        ],
        isCompleted: false,
        completedAt: null,
        createdAt: new Date("2025-01-15T10:00:00Z"),
        updatedAt: new Date("2025-01-15T11:00:00Z"),
      };

      vi.mocked(updateUserProfile).mockResolvedValue({
        success: true,
        data: updatedUser,
      });

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": validApiKey,
          },
          body: JSON.stringify({
            skinType: ["dry", "sensitive"],
            concerns: ["wrinkles"],
            hasAllergies: true,
            allergyDetails: "Fragrance allergies",
          }),
        }
      );

      // When: calling PATCH handler
      const response = await PATCH(request, { params: { id: userId } });

      // Then: returns 200 with updated user
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(userId);
      expect(data.skinType).toEqual(["dry", "sensitive"]);
      expect(data.concerns).toEqual(["wrinkles"]);
      expect(updateUserProfile).toHaveBeenCalledWith(userId, {
        skinType: ["dry", "sensitive"],
        concerns: ["wrinkles"],
        hasAllergies: true,
        allergyDetails: "Fragrance allergies",
      });
    });
  });

  describe("Error Cases", () => {
    it("returns 404 when user not found", async () => {
      // Given: server action returns not found error
      vi.mocked(validateApiKey).mockReturnValue(null);
      vi.mocked(updateUserProfile).mockResolvedValue({
        success: false,
        error: "Profile not found",
      });

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": validApiKey,
          },
          body: JSON.stringify({
            skinType: ["dry"],
          }),
        }
      );

      // When: calling PATCH handler
      const response = await PATCH(request, { params: { id: userId } });

      // Then: returns 404
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Profile not found");
    });

    it("returns 400 for validation errors", async () => {
      // Given: server action returns validation error
      vi.mocked(validateApiKey).mockReturnValue(null);
      vi.mocked(updateUserProfile).mockResolvedValue({
        success: false,
        error: "Invalid data",
      });

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": validApiKey,
          },
          body: JSON.stringify({
            skinType: ["invalid-type"],
          }),
        }
      );

      // When: calling PATCH handler
      const response = await PATCH(request, { params: { id: userId } });

      // Then: returns 400
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid data");
    });

    it("returns 500 for internal server errors", async () => {
      // Given: request throws unexpected error
      vi.mocked(validateApiKey).mockReturnValue(null);
      vi.mocked(updateUserProfile).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest(
        `${baseUrl}/api/user-profiles/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": validApiKey,
          },
          body: JSON.stringify({
            skinType: ["dry"],
          }),
        }
      );

      // When: calling PATCH handler
      const response = await PATCH(request, { params: { id: userId } });

      // Then: returns 500
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Internal server error");
    });
  });
});
