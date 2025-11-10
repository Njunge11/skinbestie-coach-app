import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "../../route";
import { NextRequest } from "next/server";
import * as journalsService from "../../../journals.service";
import type { IJournalsService } from "../../../journals.service";

// Mock the service for route-layer tests
vi.mock("../../../journals.service", () => ({
  createJournalsService: vi.fn(),
  makeJournalsService: vi.fn(),
}));

// Mock auth for route-layer tests
vi.mock("../../../../shared/auth", () => ({
  validateApiKey: vi.fn(),
}));

import { validateApiKey } from "../../../../shared/auth";

// Helper to create a properly typed mock service with all required methods
function createMockService(
  overrides: Partial<IJournalsService> = {},
): IJournalsService {
  return {
    createJournal: vi.fn(),
    updateJournal: vi.fn(),
    deleteJournal: vi.fn(),
    getJournal: vi.fn(),
    listJournals: vi.fn(),
    ...overrides,
  };
}

describe("DELETE /api/consumer-app/journals/[id]", () => {
  const TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000";
  const TEST_JOURNAL_ID = "660e8400-e29b-41d4-a716-446655440001";

  const mockCreateJournalsService = vi.mocked(
    journalsService.createJournalsService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should return 401 if API key is missing", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(false);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "DELETE",
          body: JSON.stringify({ userId: TEST_USER_ID }),
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 if API key is invalid", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(false);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "DELETE",
          headers: {
            "x-api-key": "invalid-key",
          },
          body: JSON.stringify({ userId: TEST_USER_ID }),
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("Request Parsing", () => {
    it("should extract journal ID from params correctly", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const mockService = createMockService({
        deleteJournal: vi.fn().mockResolvedValue({
          success: true,
        }),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "DELETE",
          body: JSON.stringify({ userId: TEST_USER_ID }),
        },
      );

      await DELETE(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(mockService.deleteJournal).toHaveBeenCalledWith(
        TEST_JOURNAL_ID,
        TEST_USER_ID,
      );
    });
  });

  describe("Validation", () => {
    it("should return 400 if userId is missing from body", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "DELETE",
          body: JSON.stringify({}),
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.message).toContain("userId is required");
    });

    it("should accept valid UUID in params", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const mockService = createMockService({
        deleteJournal: vi.fn().mockResolvedValue({
          success: true,
        }),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const validUUID = "123e4567-e89b-12d3-a456-426614174000";

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${validUUID}`,
        {
          method: "DELETE",
          body: JSON.stringify({ userId: TEST_USER_ID }),
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: validUUID }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe("Success Cases", () => {
    it("should return 200 when delete succeeds", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const mockService = createMockService({
        deleteJournal: vi.fn().mockResolvedValue({
          success: true,
        }),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "DELETE",
          body: JSON.stringify({ userId: TEST_USER_ID }),
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(200);
    });

    it("should return success message in correct format", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const mockService = createMockService({
        deleteJournal: vi.fn().mockResolvedValue({
          success: true,
        }),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "DELETE",
          body: JSON.stringify({ userId: TEST_USER_ID }),
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      const data = await response.json();
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("message");
      expect(data.success).toBe(true);
      expect(data.message).toContain("deleted successfully");
    });

    it("should call service with correct journal ID and userProfileId", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const mockService = createMockService({
        deleteJournal: vi.fn().mockResolvedValue({
          success: true,
        }),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "DELETE",
          body: JSON.stringify({ userId: TEST_USER_ID }),
        },
      );

      await DELETE(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(mockService.deleteJournal).toHaveBeenCalledWith(
        TEST_JOURNAL_ID,
        TEST_USER_ID,
      );
      expect(mockService.deleteJournal).toHaveBeenCalledTimes(1);
    });

    it("should NOT return journal data in response", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const mockService = createMockService({
        deleteJournal: vi.fn().mockResolvedValue({
          success: true,
        }),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "DELETE",
          body: JSON.stringify({ userId: TEST_USER_ID }),
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      const data = await response.json();
      // Should NOT have journal fields
      expect(data).not.toHaveProperty("id");
      expect(data).not.toHaveProperty("title");
      expect(data).not.toHaveProperty("content");
      // Should only have success and message
      expect(Object.keys(data)).toEqual(["success", "message"]);
    });
  });

  describe("Error Handling", () => {
    it("should return 404 when service returns Journal not found", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const mockService = createMockService({
        deleteJournal: vi.fn().mockResolvedValue({
          success: false,
          error: "Journal not found",
        }),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "DELETE",
          body: JSON.stringify({ userId: TEST_USER_ID }),
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error.code).toBe("NOT_FOUND");
    });

    it("should return 403 when service returns Unauthorized to delete journal", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const mockService = createMockService({
        deleteJournal: vi.fn().mockResolvedValue({
          success: false,
          error: "Unauthorized to delete journal",
        }),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "DELETE",
          body: JSON.stringify({
            userId: "770e8400-e29b-41d4-a716-446655440099",
          }),
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error.code).toBe("FORBIDDEN");
    });

    it("should return 500 when service returns other error", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const mockService = createMockService({
        deleteJournal: vi.fn().mockResolvedValue({
          success: false,
          error: "Database connection failed",
        }),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "DELETE",
          body: JSON.stringify({ userId: TEST_USER_ID }),
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });

    it("should return 500 if service throws unexpected error", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const mockService = createMockService({
        deleteJournal: vi.fn().mockRejectedValue(new Error("Unexpected error")),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "DELETE",
          body: JSON.stringify({ userId: TEST_USER_ID }),
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });

    it("should return 400 if request body is invalid JSON", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: "invalid json{",
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
      expect(data.error.message).toContain("Invalid JSON");
    });
  });
});
