import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../../route";
import type { IJournalsService } from "../../journals.service";

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

// Helper to create a properly typed mock database query chain
function createMockDbSelect(
  resolveValue: unknown[],
): ReturnType<typeof db.select> {
  const mockLimit = vi.fn().mockResolvedValue(resolveValue);
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  return { from: mockFrom } as unknown as ReturnType<typeof db.select>;
}

// Mock dependencies
vi.mock("../../../shared/auth", () => ({
  validateApiKey: vi.fn(),
}));

vi.mock("../../journals.service", () => ({
  createJournalsService: vi.fn(),
}));

// Mock database
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
  },
  userProfiles: {},
}));

import { validateApiKey } from "../../../shared/auth";
import { createJournalsService } from "../../journals.service";
import { db } from "@/lib/db";

const mockCreateJournalsService = vi.mocked(createJournalsService);

describe("GET /api/consumer-app/journals (List)", () => {
  const TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000";
  const TEST_USER_PROFILE_ID = "660e8400-e29b-41d4-a716-446655440000";

  const mockListResponse = {
    journals: [
      {
        id: "journal-1",
        userProfileId: TEST_USER_PROFILE_ID,
        title: "First Journal",
        content: { root: { children: [], type: "root", version: 1 } },
        preview: "This is a preview of the first journal entry...",
        public: true,
        createdAt: new Date("2025-11-08T10:00:00Z"),
        lastModified: new Date("2025-11-08T10:00:00Z"),
      },
      {
        id: "journal-2",
        userProfileId: TEST_USER_PROFILE_ID,
        title: "Second Journal",
        content: null,
        preview: "This is a preview of the second journal entry...",
        public: false,
        createdAt: new Date("2025-11-07T09:00:00Z"),
        lastModified: new Date("2025-11-07T09:00:00Z"),
      },
    ],
    pagination: {
      nextCursor:
        "eyJsYXN0TW9kaWZpZWQiOiIyMDI1LTExLTA3VDA5OjAwOjAwWiIsImlkIjoiam91cm5hbC0yIn0=",
      hasMore: true,
      limit: 20,
    },
  };

  let request: NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the database lookup by default
    vi.mocked(db.select).mockReturnValue(
      createMockDbSelect([{ id: TEST_USER_PROFILE_ID }]),
    );
  });

  it("should return 401 if API key is invalid", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(false);

    request = new NextRequest(
      new URL(
        `http://localhost:3000/api/consumer-app/journals?userId=${TEST_USER_ID}`,
      ),
      { method: "GET" },
    );

    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("should return 200 with journals when userId provided", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    const mockService = createMockService({
      listJournals: vi.fn().mockResolvedValue({
        success: true,
        data: mockListResponse,
      }),
    });
    mockCreateJournalsService.mockReturnValue(mockService);

    request = new NextRequest(
      new URL(
        `http://localhost:3000/api/consumer-app/journals?userId=${TEST_USER_ID}`,
      ),
      { method: "GET" },
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.journals).toHaveLength(2);
    expect(data.pagination).toBeDefined();
  });

  it("should lookup userProfileId from userId and pass to service", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    const mockService = createMockService({
      listJournals: vi.fn().mockResolvedValue({
        success: true,
        data: mockListResponse,
      }),
    });
    mockCreateJournalsService.mockReturnValue(mockService);

    request = new NextRequest(
      new URL(
        `http://localhost:3000/api/consumer-app/journals?userId=${TEST_USER_ID}`,
      ),
      { method: "GET" },
    );

    await GET(request);

    expect(mockService.listJournals).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfileId: TEST_USER_PROFILE_ID,
      }),
    );
  });

  it("should pass cursor to service when cursor provided", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    const mockService = createMockService({
      listJournals: vi.fn().mockResolvedValue({
        success: true,
        data: mockListResponse,
      }),
    });
    mockCreateJournalsService.mockReturnValue(mockService);

    const testCursor =
      "eyJsYXN0TW9kaWZpZWQiOiIyMDI1LTExLTA3VDA5OjAwOjAwWiIsImlkIjoiam91cm5hbC0yIn0=";
    request = new NextRequest(
      new URL(
        `http://localhost:3000/api/consumer-app/journals?userId=${TEST_USER_ID}&cursor=${testCursor}`,
      ),
      { method: "GET" },
    );

    await GET(request);

    expect(mockService.listJournals).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfileId: TEST_USER_PROFILE_ID,
        cursor: testCursor,
      }),
    );
  });

  it("should pass limit to service when provided", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    const mockService = createMockService({
      listJournals: vi.fn().mockResolvedValue({
        success: true,
        data: mockListResponse,
      }),
    });
    mockCreateJournalsService.mockReturnValue(mockService);

    request = new NextRequest(
      new URL(
        `http://localhost:3000/api/consumer-app/journals?userId=${TEST_USER_ID}&limit=10`,
      ),
      { method: "GET" },
    );

    await GET(request);

    expect(mockService.listJournals).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfileId: TEST_USER_PROFILE_ID,
        limit: 10,
      }),
    );
  });

  it("should use default limit of 20 when not provided", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    const mockService = createMockService({
      listJournals: vi.fn().mockResolvedValue({
        success: true,
        data: mockListResponse,
      }),
    });
    mockCreateJournalsService.mockReturnValue(mockService);

    request = new NextRequest(
      new URL(
        `http://localhost:3000/api/consumer-app/journals?userId=${TEST_USER_ID}`,
      ),
      { method: "GET" },
    );

    await GET(request);

    expect(mockService.listJournals).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfileId: TEST_USER_PROFILE_ID,
        limit: 20,
      }),
    );
  });

  it("should return 400 when userId missing", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);

    request = new NextRequest(
      new URL(`http://localhost:3000/api/consumer-app/journals`),
      { method: "GET" },
    );

    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
    expect(data.error.message).toContain("userId");
  });

  it("should return 400 when userId is not valid UUID", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);

    request = new NextRequest(
      new URL(
        `http://localhost:3000/api/consumer-app/journals?userId=invalid-uuid`,
      ),
      { method: "GET" },
    );

    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });

  it("should return 404 when user profile not found", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);

    // Mock no user profile found
    vi.mocked(db.select).mockReturnValue(createMockDbSelect([])); // Empty array = not found

    request = new NextRequest(
      new URL(
        `http://localhost:3000/api/consumer-app/journals?userId=${TEST_USER_ID}`,
      ),
      { method: "GET" },
    );

    const response = await GET(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("should return 400 when limit is less than 1", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);

    request = new NextRequest(
      new URL(
        `http://localhost:3000/api/consumer-app/journals?userId=${TEST_USER_ID}&limit=0`,
      ),
      { method: "GET" },
    );

    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
    expect(data.error.message).toContain("limit");
  });

  it("should return 400 when limit is greater than 20", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);

    request = new NextRequest(
      new URL(
        `http://localhost:3000/api/consumer-app/journals?userId=${TEST_USER_ID}&limit=21`,
      ),
      { method: "GET" },
    );

    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
    expect(data.error.message).toContain("limit");
  });

  it("should return 400 when cursor is invalid base64", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);

    request = new NextRequest(
      new URL(
        `http://localhost:3000/api/consumer-app/journals?userId=${TEST_USER_ID}&cursor=not-valid-base64!!!`,
      ),
      { method: "GET" },
    );

    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
    expect(data.error.message).toContain("cursor");
  });

  it("should return journals array and pagination object", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    const mockService = createMockService({
      listJournals: vi.fn().mockResolvedValue({
        success: true,
        data: mockListResponse,
      }),
    });
    mockCreateJournalsService.mockReturnValue(mockService);

    request = new NextRequest(
      new URL(
        `http://localhost:3000/api/consumer-app/journals?userId=${TEST_USER_ID}`,
      ),
      { method: "GET" },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(data).toHaveProperty("journals");
    expect(data).toHaveProperty("pagination");
    expect(Array.isArray(data.journals)).toBe(true);
    expect(data.pagination).toHaveProperty("nextCursor");
    expect(data.pagination).toHaveProperty("hasMore");
    expect(data.pagination).toHaveProperty("limit");
  });

  it("should return 500 when service throws exception", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);
    const mockService = createMockService({
      listJournals: vi.fn().mockRejectedValue(new Error("Service error")),
    });
    mockCreateJournalsService.mockReturnValue(mockService);

    request = new NextRequest(
      new URL(
        `http://localhost:3000/api/consumer-app/journals?userId=${TEST_USER_ID}`,
      ),
      { method: "GET" },
    );

    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error.code).toBe("INTERNAL_ERROR");
  });
});
