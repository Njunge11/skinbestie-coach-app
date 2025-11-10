import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "../../route";
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

describe("PATCH /api/consumer-app/journals/[id]", () => {
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
          method: "PATCH",
          body: JSON.stringify({}),
        },
      );

      const response = await PATCH(request, {
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
          method: "PATCH",
          headers: {
            "x-api-key": "invalid-key",
          },
          body: JSON.stringify({}),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("Request Parsing", () => {
    it("should return 400 if request body is invalid JSON", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: "invalid json{",
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
      expect(data.error.message).toContain("Invalid JSON");
    });
  });

  describe("Validation", () => {
    it("should return 400 if title is empty string", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: TEST_USER_ID,
            title: "   ",
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("should return 400 if content has invalid Lexical structure", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: TEST_USER_ID,
            content: { invalid: "structure" },
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
      expect(data.error.message).toContain("Validation failed");
    });

    it("should return 400 if userId is missing", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: "New Title",
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("should accept request with only title field", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const mockService = createMockService({
        updateJournal: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: TEST_JOURNAL_ID,
            userId: TEST_USER_ID,
            title: "Updated Title",
            content: { root: { children: [], type: "root", version: 1 } },
            public: false,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
          },
        }),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: TEST_USER_ID,
            title: "Updated Title",
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(200);
    });

    it("should accept request with empty body (no updates)", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const mockService = createMockService({
        updateJournal: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: TEST_JOURNAL_ID,
            userId: TEST_USER_ID,
            title: "Original",
            content: { root: { children: [], type: "root", version: 1 } },
            public: false,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
          },
        }),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: TEST_USER_ID,
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe("Success Cases", () => {
    it("should return 200 when updating only title", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const mockService = createMockService({
        updateJournal: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: TEST_JOURNAL_ID,
            userId: TEST_USER_ID,
            title: "Updated Title",
            content: { root: { children: [], type: "root", version: 1 } },
            public: false,
            createdAt: new Date(),
            lastModified: new Date(),
          },
        }),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: TEST_USER_ID,
            title: "Updated Title",
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.title).toBe("Updated Title");
    });

    it("should return 200 when updating only content", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const newContent = {
        root: {
          children: [{ text: "New content", type: "text" }],
          type: "root",
          version: 1,
        },
      };

      const mockService = createMockService({
        updateJournal: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: TEST_JOURNAL_ID,
            userId: TEST_USER_ID,
            title: "My Journal",
            content: newContent,
            public: false,
            createdAt: new Date(),
            lastModified: new Date(),
          },
        }),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: TEST_USER_ID,
            content: newContent,
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.content).toEqual(newContent);
    });

    it("should return 200 when updating only public flag", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const mockService = createMockService({
        updateJournal: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: TEST_JOURNAL_ID,
            userId: TEST_USER_ID,
            title: "My Journal",
            content: { root: { children: [], type: "root", version: 1 } },
            public: true,
            createdAt: new Date(),
            lastModified: new Date(),
          },
        }),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: TEST_USER_ID,
            public: true,
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.public).toBe(true);
    });

    it("should return 200 when updating all fields", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const newContent = {
        root: {
          children: [{ text: "All new", type: "text" }],
          type: "root",
          version: 1,
        },
      };

      const mockService = createMockService({
        updateJournal: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: TEST_JOURNAL_ID,
            userId: TEST_USER_ID,
            title: "All New Title",
            content: newContent,
            public: true,
            createdAt: new Date(),
            lastModified: new Date(),
          },
        }),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: TEST_USER_ID,
            title: "All New Title",
            content: newContent,
            public: true,
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.title).toBe("All New Title");
      expect(data.content).toEqual(newContent);
      expect(data.public).toBe(true);
    });

    it("should return journal data directly (not wrapped)", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const mockJournal = {
        id: TEST_JOURNAL_ID,
        userId: TEST_USER_ID,
        title: "Updated",
        content: { root: { children: [], type: "root", version: 1 } },
        public: false,
        createdAt: new Date(),
        lastModified: new Date(),
      };

      const mockService = createMockService({
        updateJournal: vi.fn().mockResolvedValue({
          success: true,
          data: mockJournal,
        }),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: TEST_USER_ID,
            title: "Updated",
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      const data = await response.json();
      // Should NOT have success/data wrapper
      expect(data).not.toHaveProperty("success");
      expect(data).not.toHaveProperty("data");
      // Should have journal fields directly
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("title");
    });
  });

  describe("Error Handling", () => {
    it("should return 404 when service returns Journal not found", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const mockService = createMockService({
        updateJournal: vi.fn().mockResolvedValue({
          success: false,
          error: "Journal not found",
        }),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: TEST_USER_ID,
            title: "Updated",
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error.code).toBe("NOT_FOUND");
    });

    it("should return 403 when service returns Unauthorized to update journal", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const mockService = createMockService({
        updateJournal: vi.fn().mockResolvedValue({
          success: false,
          error: "Unauthorized to update journal",
        }),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: "770e8400-e29b-41d4-a716-446655440099",
            title: "Trying to update someone else's journal",
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error.code).toBe("FORBIDDEN");
    });

    it("should return 500 when service returns other error", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const mockService = createMockService({
        updateJournal: vi.fn().mockResolvedValue({
          success: false,
          error: "Database connection failed",
        }),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: TEST_USER_ID,
            title: "Updated",
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });

    it("should return 500 if service throws unexpected error", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(true);

      const mockService = createMockService({
        updateJournal: vi.fn().mockRejectedValue(new Error("Unexpected error")),
      });

      mockCreateJournalsService.mockReturnValue(mockService);

      const request = new NextRequest(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: TEST_USER_ID,
            title: "Updated",
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: TEST_JOURNAL_ID }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error.code).toBe("INTERNAL_ERROR");
      expect(data.error.message).toContain("unexpected error");
    });
  });
});
