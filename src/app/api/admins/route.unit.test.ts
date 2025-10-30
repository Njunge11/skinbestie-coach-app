import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { makeAdmin } from "@/test/factories";

// Mock the database
vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(),
  },
}));

// Mock the schema
vi.mock("@/lib/db/schema", () => ({
  admins: {},
}));

import { db } from "@/lib/db";

describe("POST /api/admins", () => {
  const validApiKey = "test-api-key-123";
  const baseUrl = "http://localhost:3000";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CONSUMER_APP_API_KEY = validApiKey;
  });

  describe("Authentication", () => {
    it("returns 401 when API key is missing", async () => {
      // Given: request without API key
      const request = new NextRequest(`${baseUrl}/api/admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "admin@example.com",
          name: "Admin User",
        }),
      });

      // When: calling POST handler
      const response = await POST(request);

      // Then: returns 401
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized - Invalid or missing API key");
      expect(db.insert).not.toHaveBeenCalled();
    });

    it("returns 401 when API key is invalid", async () => {
      // Given: request with invalid API key
      const request = new NextRequest(`${baseUrl}/api/admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "wrong-key",
        },
        body: JSON.stringify({
          email: "admin@example.com",
          name: "Admin User",
        }),
      });

      // When: calling POST handler
      const response = await POST(request);

      // Then: returns 401
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized - Invalid or missing API key");
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe("Success Cases", () => {
    it("creates admin successfully with valid API key", async () => {
      // Given: valid request with API key

      const mockAdmin = makeAdmin({
        email: "admin@example.com",
        name: "Admin User",
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockAdmin]),
        }),
      });

      vi.mocked(db.insert).mockImplementation(mockInsert);

      const request = new NextRequest(`${baseUrl}/api/admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": validApiKey,
        },
        body: JSON.stringify({
          email: "admin@example.com",
          name: "Admin User",
        }),
      });

      // When: calling POST handler
      const response = await POST(request);

      // Then: returns 201 with created admin
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBe(mockAdmin.id);
      expect(data.email).toBe("admin@example.com");
      expect(data.name).toBe("Admin User");
      expect(data.passwordSet).toBe(false);
      expect(data.role).toBe("admin");
      expect(db.insert).toHaveBeenCalled();
    });

    it("creates admin with only email (name optional)", async () => {
      // Given: valid request without name

      const mockAdmin = makeAdmin({
        email: "admin@example.com",
        name: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockAdmin]),
        }),
      });

      vi.mocked(db.insert).mockImplementation(mockInsert);

      const request = new NextRequest(`${baseUrl}/api/admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": validApiKey,
        },
        body: JSON.stringify({
          email: "admin@example.com",
        }),
      });

      // When: calling POST handler
      const response = await POST(request);

      // Then: returns 201
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.email).toBe("admin@example.com");
      expect(data.name).toBe(null);
    });
  });

  describe("Error Cases", () => {
    it("returns 400 when email is missing", async () => {
      // Given: request without email

      const request = new NextRequest(`${baseUrl}/api/admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": validApiKey,
        },
        body: JSON.stringify({
          name: "Admin User",
        }),
      });

      // When: calling POST handler
      const response = await POST(request);

      // Then: returns 400
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(db.insert).not.toHaveBeenCalled();
    });

    it("returns 400 when email is invalid", async () => {
      // Given: request with invalid email

      const request = new NextRequest(`${baseUrl}/api/admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": validApiKey,
        },
        body: JSON.stringify({
          email: "not-an-email",
          name: "Admin User",
        }),
      });

      // When: calling POST handler
      const response = await POST(request);

      // Then: returns 400
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("email");
      expect(db.insert).not.toHaveBeenCalled();
    });

    it("returns 409 when admin with email already exists", async () => {
      // Given: database returns unique constraint error

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue({
            code: "23505", // PostgreSQL unique violation
            constraint: "admins_email_unique",
          }),
        }),
      });

      vi.mocked(db.insert).mockImplementation(mockInsert);

      const request = new NextRequest(`${baseUrl}/api/admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": validApiKey,
        },
        body: JSON.stringify({
          email: "existing@example.com",
          name: "Admin User",
        }),
      });

      // When: calling POST handler
      const response = await POST(request);

      // Then: returns 409
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toContain("already exists");
    });

    it("returns 500 for internal server errors", async () => {
      // Given: database throws unexpected error

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi
            .fn()
            .mockRejectedValue(new Error("Database connection failed")),
        }),
      });

      vi.mocked(db.insert).mockImplementation(mockInsert);

      const request = new NextRequest(`${baseUrl}/api/admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": validApiKey,
        },
        body: JSON.stringify({
          email: "admin@example.com",
          name: "Admin User",
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
