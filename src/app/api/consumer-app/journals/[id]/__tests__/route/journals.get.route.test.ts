import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../../route";
import type { IJournalsService } from "../../../journals.service";

// Mock dependencies
vi.mock("../../../../shared/auth", () => ({
  validateApiKey: vi.fn(),
}));

vi.mock("../../../journals.service", () => ({
  createJournalsService: vi.fn(),
}));

import { validateApiKey } from "../../../../shared/auth";
import { createJournalsService } from "../../../journals.service";

const mockCreateJournalsService = vi.mocked(createJournalsService);

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

describe("GET /api/consumer-app/journals/[id]", () => {
  const TEST_JOURNAL_ID = "660e8400-e29b-41d4-a716-446655440001";
  const TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000";

  const mockJournal = {
    id: TEST_JOURNAL_ID,
    userId: TEST_USER_ID,
    title: "Test Journal",
    content: {
      root: {
        children: [{ text: "Test content", type: "text" }],
        type: "root",
        version: 1,
      },
    },
    public: true,
    createdAt: new Date("2025-11-08T10:00:00Z"),
    lastModified: new Date("2025-11-08T10:00:00Z"),
  };

  let request: NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    request = new NextRequest(
      new URL(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}`,
      ),
      {
        method: "GET",
      },
    );
  });

  it("should return 401 if API key is invalid", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(false);

    const response = await GET(request, {
      params: Promise.resolve({ id: TEST_JOURNAL_ID }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("should return journal when found and public", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    const mockService = createMockService({
      getJournal: vi.fn().mockResolvedValue({
        success: true,
        data: mockJournal,
      }),
    });
    mockCreateJournalsService.mockReturnValue(mockService);

    const response = await GET(request, {
      params: Promise.resolve({ id: TEST_JOURNAL_ID }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.id).toBe(TEST_JOURNAL_ID);
    expect(data.title).toBe("Test Journal");
  });

  it("should pass userProfileId from query params to service", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    const mockService = createMockService({
      getJournal: vi.fn().mockResolvedValue({
        success: true,
        data: mockJournal,
      }),
    });
    mockCreateJournalsService.mockReturnValue(mockService);

    const requestWithUserId = new NextRequest(
      new URL(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}?userId=${TEST_USER_ID}`,
      ),
      {
        method: "GET",
      },
    );

    await GET(requestWithUserId, {
      params: Promise.resolve({ id: TEST_JOURNAL_ID }),
    });

    expect(mockService.getJournal).toHaveBeenCalledWith(
      TEST_JOURNAL_ID,
      TEST_USER_ID,
    );
  });

  it("should call service without userProfileId when not provided in query", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    const mockService = createMockService({
      getJournal: vi.fn().mockResolvedValue({
        success: true,
        data: mockJournal,
      }),
    });
    mockCreateJournalsService.mockReturnValue(mockService);

    await GET(request, {
      params: Promise.resolve({ id: TEST_JOURNAL_ID }),
    });

    expect(mockService.getJournal).toHaveBeenCalledWith(
      TEST_JOURNAL_ID,
      undefined,
    );
  });

  it("should return 404 when journal not found", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    const mockService = createMockService({
      getJournal: vi.fn().mockResolvedValue({
        success: false,
        error: "Journal not found",
      }),
    });
    mockCreateJournalsService.mockReturnValue(mockService);

    const response = await GET(request, {
      params: Promise.resolve({ id: TEST_JOURNAL_ID }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("should return 403 when unauthorized to view journal", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    const mockService = createMockService({
      getJournal: vi.fn().mockResolvedValue({
        success: false,
        error: "Unauthorized to view this journal",
      }),
    });
    mockCreateJournalsService.mockReturnValue(mockService);

    const response = await GET(request, {
      params: Promise.resolve({ id: TEST_JOURNAL_ID }),
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error.code).toBe("FORBIDDEN");
    expect(data.error.message).toContain("permission to view");
  });

  it("should return 500 for unexpected service errors", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    const mockService = createMockService({
      getJournal: vi.fn().mockResolvedValue({
        success: false,
        error: "Some unexpected error",
      }),
    });
    mockCreateJournalsService.mockReturnValue(mockService);

    const response = await GET(request, {
      params: Promise.resolve({ id: TEST_JOURNAL_ID }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error.code).toBe("INTERNAL_ERROR");
  });

  it("should return 500 when service throws exception", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    const mockService = createMockService({
      getJournal: vi.fn().mockRejectedValue(new Error("Service crashed")),
    });
    mockCreateJournalsService.mockReturnValue(mockService);

    const response = await GET(request, {
      params: Promise.resolve({ id: TEST_JOURNAL_ID }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error.code).toBe("INTERNAL_ERROR");
  });

  it("should return journal with all expected fields", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    const mockService = createMockService({
      getJournal: vi.fn().mockResolvedValue({
        success: true,
        data: mockJournal,
      }),
    });
    mockCreateJournalsService.mockReturnValue(mockService);

    const response = await GET(request, {
      params: Promise.resolve({ id: TEST_JOURNAL_ID }),
    });

    const data = await response.json();
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("title");
    expect(data).toHaveProperty("content");
    expect(data).toHaveProperty("public");
    expect(data).toHaveProperty("createdAt");
    expect(data).toHaveProperty("lastModified");
  });

  it("should handle empty userProfileId query param gracefully", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    const mockService = createMockService({
      getJournal: vi.fn().mockResolvedValue({
        success: true,
        data: mockJournal,
      }),
    });
    mockCreateJournalsService.mockReturnValue(mockService);

    const requestWithEmptyUserId = new NextRequest(
      new URL(
        `http://localhost:3000/api/consumer-app/journals/${TEST_JOURNAL_ID}?userId=`,
      ),
      {
        method: "GET",
      },
    );

    await GET(requestWithEmptyUserId, {
      params: Promise.resolve({ id: TEST_JOURNAL_ID }),
    });

    expect(mockService.getJournal).toHaveBeenCalledWith(
      TEST_JOURNAL_ID,
      undefined,
    );
  });
});
