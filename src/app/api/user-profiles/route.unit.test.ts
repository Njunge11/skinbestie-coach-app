import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

// Mock the server actions module
vi.mock("@/app/(dashboard)/subscribers/actions", () => ({
  createUserProfile: vi.fn(),
}));

// Mock the auth module
vi.mock("./auth", () => ({
  validateApiKey: vi.fn(),
}));

import { createUserProfile } from "@/app/(dashboard)/subscribers/actions";
import { validateApiKey } from "./auth";

describe("POST /api/user-profiles", () => {
  const validApiKey = "test-api-key-123";
  const baseUrl = "http://localhost:3000";

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

      const request = new NextRequest(`${baseUrl}/api/user-profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phoneNumber: "+1234567890",
          dateOfBirth: "1990-01-01",
        }),
      });

      // When: calling POST handler
      const response = await POST(request);

      // Then: returns 401
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized - Invalid or missing API key");
      expect(createUserProfile).not.toHaveBeenCalled();
    });

    it("returns 401 when API key is invalid", async () => {
      // Given: request with invalid API key
      const mockAuthError = Response.json(
        { error: "Unauthorized - Invalid or missing API key" },
        { status: 401 }
      );
      vi.mocked(validateApiKey).mockReturnValue(mockAuthError);

      const request = new NextRequest(`${baseUrl}/api/user-profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "wrong-key",
        },
        body: JSON.stringify({
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phoneNumber: "+1234567890",
          dateOfBirth: "1990-01-01",
        }),
      });

      // When: calling POST handler
      const response = await POST(request);

      // Then: returns 401
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized - Invalid or missing API key");
      expect(createUserProfile).not.toHaveBeenCalled();
    });
  });

  describe("Success Cases", () => {
    it("creates user profile successfully with valid API key", async () => {
      // Given: valid request with API key
      vi.mocked(validateApiKey).mockReturnValue(null);

      const userData = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
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

      vi.mocked(createUserProfile).mockResolvedValue({
        success: true,
        data: userData,
      });

      const request = new NextRequest(`${baseUrl}/api/user-profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": validApiKey,
        },
        body: JSON.stringify({
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phoneNumber: "+1234567890",
          dateOfBirth: "1990-01-01",
        }),
      });

      // When: calling POST handler
      const response = await POST(request);

      // Then: returns 201 with created user
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBe(userData.id);
      expect(data.firstName).toBe("John");
      expect(data.email).toBe("john@example.com");
      expect(createUserProfile).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phoneNumber: "+1234567890",
        dateOfBirth: "1990-01-01",
      });
    });
  });

  describe("Error Cases", () => {
    it("returns 409 when user already exists", async () => {
      // Given: server action returns duplicate error
      vi.mocked(validateApiKey).mockReturnValue(null);
      vi.mocked(createUserProfile).mockResolvedValue({
        success: false,
        error: "User with this email or phone number is already registered",
      });

      const request = new NextRequest(`${baseUrl}/api/user-profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": validApiKey,
        },
        body: JSON.stringify({
          firstName: "John",
          lastName: "Doe",
          email: "existing@example.com",
          phoneNumber: "+1234567890",
          dateOfBirth: "1990-01-01",
        }),
      });

      // When: calling POST handler
      const response = await POST(request);

      // Then: returns 409
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toContain("already registered");
    });

    it("returns 400 for validation errors", async () => {
      // Given: server action returns validation error
      vi.mocked(validateApiKey).mockReturnValue(null);
      vi.mocked(createUserProfile).mockResolvedValue({
        success: false,
        error: "Invalid data",
      });

      const request = new NextRequest(`${baseUrl}/api/user-profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": validApiKey,
        },
        body: JSON.stringify({
          firstName: "",
          lastName: "Doe",
          email: "invalid-email",
          phoneNumber: "+1234567890",
          dateOfBirth: "1990-01-01",
        }),
      });

      // When: calling POST handler
      const response = await POST(request);

      // Then: returns 400
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid data");
    });

    it("returns 500 for internal server errors", async () => {
      // Given: request throws unexpected error
      vi.mocked(validateApiKey).mockReturnValue(null);
      vi.mocked(createUserProfile).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest(`${baseUrl}/api/user-profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": validApiKey,
        },
        body: JSON.stringify({
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phoneNumber: "+1234567890",
          dateOfBirth: "1990-01-01",
        }),
      });

      // When: calling POST handler
      const response = await POST(request);

      // Then: returns 500
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Internal server error");
    });
  });
});
