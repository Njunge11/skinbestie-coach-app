import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../../route";
import { NextRequest } from "next/server";
import * as journalsService from "../../journals.service";
import type { IJournalsService } from "../../journals.service";

// Mock the service for route-layer tests
vi.mock("../../journals.service", () => ({
  createJournalsService: vi.fn(),
  makeJournalsService: vi.fn(),
}));

// Mock auth for route-layer tests
vi.mock("../../../shared/auth", () => ({
  validateApiKey: vi.fn(),
}));

import { validateApiKey } from "../../../shared/auth";

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

describe("POST /api/consumer-app/journals", () => {
  // Test UUIDs for mocked tests
  const TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000"; // Auth userId
  const TEST_JOURNAL_ID = "660e8400-e29b-41d4-a716-446655440001";

  // ========================================
  // Route Layer Tests (Mocked Service)
  // ========================================
  describe("Route Layer (Mocked)", () => {
    const mockCreateJournalsService = vi.mocked(
      journalsService.createJournalsService,
    );

    beforeEach(() => {
      vi.clearAllMocks();
    });

    // ========================================
    // Authentication Tests
    // ========================================
    describe("Authentication", () => {
      it("should return 401 if API key is missing", async () => {
        vi.mocked(validateApiKey).mockResolvedValue(false);

        const mockService = createMockService({
          createJournal: vi.fn(),
        });
        mockCreateJournalsService.mockReturnValue(mockService);

        const request = new NextRequest(
          "http://localhost:3000/api/consumer-app/journals",
          {
            method: "POST",
            body: JSON.stringify({ userId: TEST_USER_ID }),
          },
        );

        const response = await POST(request);
        expect(response.status).toBe(401);

        const data = await response.json();
        expect(data.error.code).toBe("UNAUTHORIZED");
        expect(mockService.createJournal).not.toHaveBeenCalled();
      });

      it("should return 401 if API key is invalid", async () => {
        vi.mocked(validateApiKey).mockResolvedValue(false);

        const mockService = createMockService({
          createJournal: vi.fn(),
        });
        mockCreateJournalsService.mockReturnValue(mockService);

        const request = new NextRequest(
          "http://localhost:3000/api/consumer-app/journals",
          {
            method: "POST",
            body: JSON.stringify({ userId: TEST_USER_ID }),
          },
        );

        const response = await POST(request);
        expect(response.status).toBe(401);
        expect(mockService.createJournal).not.toHaveBeenCalled();
      });
    });

    // ========================================
    // Validation Tests
    // ========================================
    describe("Validation", () => {
      beforeEach(() => {
        vi.mocked(validateApiKey).mockResolvedValue(true);
      });

      it("should return 400 if userId is missing", async () => {
        const mockService = createMockService({
          createJournal: vi.fn(),
        });
        mockCreateJournalsService.mockReturnValue(mockService);

        const request = new NextRequest(
          "http://localhost:3000/api/consumer-app/journals",
          {
            method: "POST",
            body: JSON.stringify({ title: "My Journal" }),
          },
        );

        const response = await POST(request);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error.code).toBe("INVALID_REQUEST");
        expect(mockService.createJournal).not.toHaveBeenCalled();
      });

      it("should return 400 if userId is not a valid UUID", async () => {
        const mockService = createMockService({
          createJournal: vi.fn(),
        });
        mockCreateJournalsService.mockReturnValue(mockService);

        const request = new NextRequest(
          "http://localhost:3000/api/consumer-app/journals",
          {
            method: "POST",
            body: JSON.stringify({ userId: "not-a-uuid" }),
          },
        );

        const response = await POST(request);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error.code).toBe("INVALID_REQUEST");
        expect(mockService.createJournal).not.toHaveBeenCalled();
      });

      it("should return 400 if title is empty string", async () => {
        const mockService = createMockService({
          createJournal: vi.fn(),
        });
        mockCreateJournalsService.mockReturnValue(mockService);

        const request = new NextRequest(
          "http://localhost:3000/api/consumer-app/journals",
          {
            method: "POST",
            body: JSON.stringify({
              userId: "550e8400-e29b-41d4-a716-446655440000",
              title: "",
            }),
          },
        );

        const response = await POST(request);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error.code).toBe("INVALID_REQUEST");
      });

      it("should return 400 if content is not valid Lexical JSON structure", async () => {
        const mockService = createMockService({
          createJournal: vi.fn(),
        });
        mockCreateJournalsService.mockReturnValue(mockService);

        const request = new NextRequest(
          "http://localhost:3000/api/consumer-app/journals",
          {
            method: "POST",
            body: JSON.stringify({
              userId: "550e8400-e29b-41d4-a716-446655440000",
              content: { invalid: "structure" },
            }),
          },
        );

        const response = await POST(request);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error.code).toBe("INVALID_REQUEST");
      });

      it("should return 400 if public is not a boolean", async () => {
        const mockService = createMockService({
          createJournal: vi.fn(),
        });
        mockCreateJournalsService.mockReturnValue(mockService);

        const request = new NextRequest(
          "http://localhost:3000/api/consumer-app/journals",
          {
            method: "POST",
            body: JSON.stringify({
              userId: "550e8400-e29b-41d4-a716-446655440000",
              public: "true", // String instead of boolean
            }),
          },
        );

        const response = await POST(request);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error.code).toBe("INVALID_REQUEST");
      });

      it("should return 400 if request body is malformed JSON", async () => {
        const mockService = createMockService({
          createJournal: vi.fn(),
        });
        mockCreateJournalsService.mockReturnValue(mockService);

        const request = new NextRequest(
          "http://localhost:3000/api/consumer-app/journals",
          {
            method: "POST",
            body: "invalid json{",
          },
        );

        const response = await POST(request);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error.code).toBe("INVALID_REQUEST");
      });
    });

    // ========================================
    // Success Cases (Mocked)
    // ========================================
    describe("Success Cases", () => {
      beforeEach(() => {
        vi.mocked(validateApiKey).mockResolvedValue(true);
      });

      it("should create journal with only userId (all other fields use defaults)", async () => {
        const mockJournal = {
          id: TEST_JOURNAL_ID,
          userProfileId: TEST_USER_ID,
          title: "Untitled Journal Entry",
          content: {
            root: {
              children: [],
              direction: "ltr",
              format: "",
              indent: 0,
              type: "root",
              version: 1,
            },
          },
          public: false,
          createdAt: new Date("2024-01-01T12:00:00Z"),
          lastModified: new Date("2024-01-01T12:00:00Z"),
        };

        const mockService = createMockService({
          createJournal: vi.fn().mockResolvedValue({
            success: true,
            data: mockJournal,
          }),
        });
        mockCreateJournalsService.mockReturnValue(mockService);

        const request = new NextRequest(
          "http://localhost:3000/api/consumer-app/journals",
          {
            method: "POST",
            body: JSON.stringify({
              userId: TEST_USER_ID,
            }),
          },
        );

        const response = await POST(request);
        expect(response.status).toBe(201);

        const data = await response.json();
        expect(data.id).toBe(TEST_JOURNAL_ID);
        expect(data.title).toBe("Untitled Journal Entry");
        expect(data.public).toBe(false);
      });

      it("should create journal with custom title", async () => {
        const mockJournal = {
          id: TEST_JOURNAL_ID,
          userProfileId: TEST_USER_ID,
          title: "My Custom Title",
          content: {
            root: {
              children: [],
              direction: "ltr",
              format: "",
              indent: 0,
              type: "root",
              version: 1,
            },
          },
          public: false,
          createdAt: new Date("2024-01-01T12:00:00Z"),
          lastModified: new Date("2024-01-01T12:00:00Z"),
        };

        const mockService = createMockService({
          createJournal: vi.fn().mockResolvedValue({
            success: true,
            data: mockJournal,
          }),
        });
        mockCreateJournalsService.mockReturnValue(mockService);

        const request = new NextRequest(
          "http://localhost:3000/api/consumer-app/journals",
          {
            method: "POST",
            body: JSON.stringify({
              userId: TEST_USER_ID,
              title: "My Custom Title",
            }),
          },
        );

        const response = await POST(request);
        expect(response.status).toBe(201);

        const data = await response.json();
        expect(data.title).toBe("My Custom Title");
      });

      it("should create journal with custom content (Lexical JSON)", async () => {
        const customContent = {
          root: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: "normal",
                    style: "",
                    text: "This is my journal entry!",
                    type: "text",
                    version: 1,
                  },
                ],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "paragraph",
                version: 1,
              },
            ],
            direction: "ltr",
            format: "",
            indent: 0,
            type: "root",
            version: 1,
          },
        };

        const mockJournal = {
          id: TEST_JOURNAL_ID,
          userProfileId: TEST_USER_ID,
          title: "Untitled Journal Entry",
          content: customContent,
          public: false,
          createdAt: new Date("2024-01-01T12:00:00Z"),
          lastModified: new Date("2024-01-01T12:00:00Z"),
        };

        const mockService = createMockService({
          createJournal: vi.fn().mockResolvedValue({
            success: true,
            data: mockJournal,
          }),
        });
        mockCreateJournalsService.mockReturnValue(mockService);

        const request = new NextRequest(
          "http://localhost:3000/api/consumer-app/journals",
          {
            method: "POST",
            body: JSON.stringify({
              userId: TEST_USER_ID,
              content: customContent,
            }),
          },
        );

        const response = await POST(request);
        expect(response.status).toBe(201);

        const data = await response.json();
        expect(data.content).toEqual(customContent);
      });

      it("should create journal as public (public: true)", async () => {
        const mockJournal = {
          id: TEST_JOURNAL_ID,
          userProfileId: TEST_USER_ID,
          title: "Public Journal",
          content: {
            root: {
              children: [],
              direction: "ltr",
              format: "",
              indent: 0,
              type: "root",
              version: 1,
            },
          },
          public: true,
          createdAt: new Date("2024-01-01T12:00:00Z"),
          lastModified: new Date("2024-01-01T12:00:00Z"),
        };

        const mockService = createMockService({
          createJournal: vi.fn().mockResolvedValue({
            success: true,
            data: mockJournal,
          }),
        });
        mockCreateJournalsService.mockReturnValue(mockService);

        const request = new NextRequest(
          "http://localhost:3000/api/consumer-app/journals",
          {
            method: "POST",
            body: JSON.stringify({
              userId: TEST_USER_ID,
              public: true,
            }),
          },
        );

        const response = await POST(request);
        expect(response.status).toBe(201);

        const data = await response.json();
        expect(data.public).toBe(true);
      });

      it("should create journal with all fields provided", async () => {
        const customContent = {
          root: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: "normal",
                    style: "",
                    text: "Complete journal entry",
                    type: "text",
                    version: 1,
                  },
                ],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "paragraph",
                version: 1,
              },
            ],
            direction: "ltr",
            format: "",
            indent: 0,
            type: "root",
            version: 1,
          },
        };

        const mockJournal = {
          id: TEST_JOURNAL_ID,
          userProfileId: TEST_USER_ID,
          title: "Complete Journal",
          content: customContent,
          public: true,
          createdAt: new Date("2024-01-01T12:00:00Z"),
          lastModified: new Date("2024-01-01T12:00:00Z"),
        };

        const mockService = createMockService({
          createJournal: vi.fn().mockResolvedValue({
            success: true,
            data: mockJournal,
          }),
        });
        mockCreateJournalsService.mockReturnValue(mockService);

        const request = new NextRequest(
          "http://localhost:3000/api/consumer-app/journals",
          {
            method: "POST",
            body: JSON.stringify({
              userId: TEST_USER_ID,
              title: "Complete Journal",
              content: customContent,
              public: true,
            }),
          },
        );

        const response = await POST(request);
        expect(response.status).toBe(201);

        const data = await response.json();
        expect(data.title).toBe("Complete Journal");
        expect(data.public).toBe(true);
        expect(data.content).toEqual(customContent);
      });

      it("should return 201 with correct response structure", async () => {
        const mockJournal = {
          id: TEST_JOURNAL_ID,
          userProfileId: TEST_USER_ID,
          title: "Test Journal",
          content: {
            root: {
              children: [],
              direction: "ltr",
              format: "",
              indent: 0,
              type: "root",
              version: 1,
            },
          },
          public: false,
          createdAt: new Date("2024-01-01T12:00:00Z"),
          lastModified: new Date("2024-01-01T12:00:00Z"),
        };

        const mockService = createMockService({
          createJournal: vi.fn().mockResolvedValue({
            success: true,
            data: mockJournal,
          }),
        });
        mockCreateJournalsService.mockReturnValue(mockService);

        const request = new NextRequest(
          "http://localhost:3000/api/consumer-app/journals",
          {
            method: "POST",
            body: JSON.stringify({
              userId: TEST_USER_ID,
            }),
          },
        );

        const response = await POST(request);
        expect(response.status).toBe(201);

        const data = await response.json();
        expect(data).toHaveProperty("id");
        expect(data).toHaveProperty("title");
        expect(data).toHaveProperty("content");
        expect(data).toHaveProperty("public");
        expect(data).toHaveProperty("createdAt");
        expect(data).toHaveProperty("lastModified");
      });
    });

    // ========================================
    // Error Handling (Mocked)
    // ========================================
    describe("Error Handling", () => {
      beforeEach(() => {
        vi.mocked(validateApiKey).mockResolvedValue(true);
      });

      it("should return 500 if service returns error", async () => {
        const mockService = createMockService({
          createJournal: vi.fn().mockResolvedValue({
            success: false,
            error: "Database connection failed",
          }),
        });
        mockCreateJournalsService.mockReturnValue(mockService);

        const request = new NextRequest(
          "http://localhost:3000/api/consumer-app/journals",
          {
            method: "POST",
            body: JSON.stringify({
              userId: TEST_USER_ID,
            }),
          },
        );

        const response = await POST(request);
        expect(response.status).toBe(500);

        const data = await response.json();
        expect(data.error.code).toBe("INTERNAL_ERROR");
        expect(data.error.message).toBe("Database connection failed");
      });

      it("should return 500 if service throws unexpected error", async () => {
        const mockService = createMockService({
          createJournal: vi
            .fn()
            .mockRejectedValue(new Error("Unexpected database error")),
        });
        mockCreateJournalsService.mockReturnValue(mockService);

        const request = new NextRequest(
          "http://localhost:3000/api/consumer-app/journals",
          {
            method: "POST",
            body: JSON.stringify({
              userId: TEST_USER_ID,
            }),
          },
        );

        const response = await POST(request);
        expect(response.status).toBe(500);

        const data = await response.json();
        expect(data.error.code).toBe("INTERNAL_ERROR");
      });
    });
  });
});
