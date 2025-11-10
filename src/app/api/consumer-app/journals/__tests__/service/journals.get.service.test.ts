import { createMockDbSelect } from "../test-helpers";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createJournalsService } from "../../journals.service";
import type { IJournalsRepository } from "../../journals.repo";
import type { Journal } from "@/lib/db/schema";

// Mock the database module
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
  },
  userProfiles: {},
}));

import { db } from "@/lib/db";

describe("Journals Service - Get Tests", () => {
  let mockRepo: IJournalsRepository;
  let service: ReturnType<typeof createJournalsService>;

  const testUserId = "user-123";
  const testUserProfileId = "550e8400-e29b-41d4-a716-446655440000";
  const testUserId2 = "user-456";
  const testUserProfileId2 = "660e8400-e29b-41d4-a716-446655440001";
  const testJournalId = "770e8400-e29b-41d4-a716-446655440002";

  const publicJournal: Journal = {
    id: testJournalId,
    userProfileId: testUserProfileId,
    title: "Public Journal",
    content: {
      root: {
        children: [{ text: "Content", type: "text" }],
        type: "root",
        version: 1,
      },
    },
    public: true,
    createdAt: new Date("2025-11-08T10:00:00Z"),
    lastModified: new Date("2025-11-08T10:00:00Z"),
  };

  const privateJournal: Journal = {
    id: testJournalId,
    userProfileId: testUserProfileId,
    title: "Private Journal",
    content: {
      root: {
        children: [{ text: "Private content", type: "text" }],
        type: "root",
        version: 1,
      },
    },
    public: false,
    createdAt: new Date("2025-11-08T10:00:00Z"),
    lastModified: new Date("2025-11-08T10:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepo = {
      createJournal: vi.fn(),
      findJournalById: vi.fn(),
      updateJournal: vi.fn(),
      deleteJournal: vi.fn(),
      findJournalsByUserProfileId: vi.fn(),
    };

    // Mock the getUserProfileId lookup - by default returns testUserProfileId for testUserId
    vi.mocked(db.select).mockImplementation(() => {
      return createMockDbSelect([{ id: testUserProfileId }]);
    });

    service = createJournalsService(mockRepo);
  });

  describe("getJournal", () => {
    it("should return journal successfully when journal exists and is public", async () => {
      vi.mocked(mockRepo.findJournalById).mockResolvedValue(publicJournal);

      const result = await service.getJournal(testJournalId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(testJournalId);
        expect(result.data.title).toBe("Public Journal");
        expect(result.data.public).toBe(true);
      }
      expect(mockRepo.findJournalById).toHaveBeenCalledWith(testJournalId);
    });

    it("should return journal when user owns private journal", async () => {
      vi.mocked(mockRepo.findJournalById).mockResolvedValue(privateJournal);

      const result = await service.getJournal(testJournalId, testUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(testJournalId);
        expect(result.data.title).toBe("Private Journal");
        expect(result.data.public).toBe(false);
      }
    });

    it("should return error when journal not found", async () => {
      vi.mocked(mockRepo.findJournalById).mockResolvedValue(null);

      const result = await service.getJournal(testJournalId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Journal not found");
      }
    });

    it("should return error when accessing private journal without userProfileId", async () => {
      vi.mocked(mockRepo.findJournalById).mockResolvedValue(privateJournal);

      const result = await service.getJournal(testJournalId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Unauthorized to view this journal");
      }
    });

    it("should return error when accessing private journal with wrong userProfileId", async () => {
      vi.mocked(mockRepo.findJournalById).mockResolvedValue(privateJournal);

      // Mock getUserProfileId to return testUserProfileId2 for testUserId2
      vi.mocked(db.select).mockReturnValue(
        createMockDbSelect([{ id: testUserProfileId2 }]),
      );

      const result = await service.getJournal(testJournalId, testUserId2);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Unauthorized to view this journal");
      }
    });

    it("should allow anyone to view public journal", async () => {
      vi.mocked(mockRepo.findJournalById).mockResolvedValue(publicJournal);

      const result = await service.getJournal(testJournalId, testUserId2);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(testJournalId);
        expect(result.data.public).toBe(true);
      }
    });

    it("should return error when repository throws error", async () => {
      vi.mocked(mockRepo.findJournalById).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await service.getJournal(testJournalId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to retrieve journal entry");
      }
    });

    it("should return all journal fields", async () => {
      vi.mocked(mockRepo.findJournalById).mockResolvedValue(publicJournal);

      const result = await service.getJournal(testJournalId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty("id");
        expect(result.data).toHaveProperty("userProfileId");
        expect(result.data).toHaveProperty("title");
        expect(result.data).toHaveProperty("content");
        expect(result.data).toHaveProperty("public");
        expect(result.data).toHaveProperty("createdAt");
        expect(result.data).toHaveProperty("lastModified");
      }
    });
  });
});
