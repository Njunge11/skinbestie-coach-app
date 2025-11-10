import { createMockDbSelect } from "../test-helpers";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createJournalsService } from "../../journals.service";
import type { IJournalsRepository } from "../../journals.repo";

// Mock the database module
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
  },
  userProfiles: {},
}));

import { db } from "@/lib/db";

describe("Journals Service - Update Tests", () => {
  let mockRepo: IJournalsRepository;

  const testUserId = "user-123";
  const testUserProfileId = "550e8400-e29b-41d4-a716-446655440000";
  const testJournalId = "660e8400-e29b-41d4-a716-446655440001";

  beforeEach(() => {
    mockRepo = {
      createJournal: vi.fn(),
      updateJournal: vi.fn(),
      findJournalById: vi.fn(),
      deleteJournal: vi.fn(),
      findJournalsByUserProfileId: vi.fn(),
    };

    // Mock the getUserProfileId lookup by default
    vi.mocked(db.select).mockReturnValue(
      createMockDbSelect([{ id: testUserProfileId }]),
    );
  });

  describe("updateJournal", () => {
    it("should successfully update journal title", async () => {
      const existingJournal = {
        id: testJournalId,
        userProfileId: testUserProfileId,
        title: "Old Title",
        content: {
          root: { children: [], type: "root", version: 1 },
        },
        public: false,
        createdAt: new Date("2025-01-01"),
        lastModified: new Date("2025-01-01"),
      };

      const updatedJournal = {
        ...existingJournal,
        title: "New Title",
        lastModified: new Date(),
      };

      vi.mocked(mockRepo.findJournalById).mockResolvedValue(existingJournal);
      vi.mocked(mockRepo.updateJournal).mockResolvedValue(updatedJournal);

      const service = createJournalsService(mockRepo);
      const result = await service.updateJournal(testJournalId, testUserId, {
        userId: testUserId,
        title: "New Title",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("New Title");
      }
      expect(mockRepo.updateJournal).toHaveBeenCalledWith(testJournalId, {
        userId: testUserId,
        title: "New Title",
      });
    });

    it("should successfully update journal content", async () => {
      const existingJournal = {
        id: testJournalId,
        userProfileId: testUserProfileId,
        title: "My Journal",
        content: {
          root: { children: [], type: "root", version: 1 },
        },
        public: false,
        createdAt: new Date(),
        lastModified: new Date(),
      };

      const newContent = {
        root: {
          children: [{ text: "New content", type: "text" }],
          type: "root",
          version: 1,
        },
      };

      const updatedJournal = {
        ...existingJournal,
        content: newContent,
        lastModified: new Date(),
      };

      vi.mocked(mockRepo.findJournalById).mockResolvedValue(existingJournal);
      vi.mocked(mockRepo.updateJournal).mockResolvedValue(updatedJournal);

      const service = createJournalsService(mockRepo);
      const result = await service.updateJournal(testJournalId, testUserId, {
        userId: testUserId,
        content: newContent,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toEqual(newContent);
      }
    });

    it("should successfully update public flag", async () => {
      const existingJournal = {
        id: testJournalId,
        userProfileId: testUserProfileId,
        title: "My Journal",
        content: {
          root: { children: [], type: "root", version: 1 },
        },
        public: false,
        createdAt: new Date(),
        lastModified: new Date(),
      };

      const updatedJournal = {
        ...existingJournal,
        public: true,
        lastModified: new Date(),
      };

      vi.mocked(mockRepo.findJournalById).mockResolvedValue(existingJournal);
      vi.mocked(mockRepo.updateJournal).mockResolvedValue(updatedJournal);

      const service = createJournalsService(mockRepo);
      const result = await service.updateJournal(testJournalId, testUserId, {
        userId: testUserId,
        public: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.public).toBe(true);
      }
    });

    it("should successfully update multiple fields at once", async () => {
      const existingJournal = {
        id: testJournalId,
        userProfileId: testUserProfileId,
        title: "Old",
        content: {
          root: { children: [], type: "root", version: 1 },
        },
        public: false,
        createdAt: new Date(),
        lastModified: new Date(),
      };

      const newContent = {
        root: {
          children: [{ text: "New", type: "text" }],
          type: "root",
          version: 1,
        },
      };

      const updatedJournal = {
        ...existingJournal,
        title: "New Title",
        content: newContent,
        public: true,
        lastModified: new Date(),
      };

      vi.mocked(mockRepo.findJournalById).mockResolvedValue(existingJournal);
      vi.mocked(mockRepo.updateJournal).mockResolvedValue(updatedJournal);

      const service = createJournalsService(mockRepo);
      const result = await service.updateJournal(testJournalId, testUserId, {
        userId: testUserId,
        title: "New Title",
        content: newContent,
        public: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("New Title");
        expect(result.data.content).toEqual(newContent);
        expect(result.data.public).toBe(true);
      }
      expect(mockRepo.updateJournal).toHaveBeenCalledWith(testJournalId, {
        userId: testUserId,
        title: "New Title",
        content: newContent,
        public: true,
      });
    });

    it("should handle empty update (no fields changed)", async () => {
      const existingJournal = {
        id: testJournalId,
        userProfileId: testUserProfileId,
        title: "My Journal",
        content: {
          root: { children: [], type: "root", version: 1 },
        },
        public: false,
        createdAt: new Date(),
        lastModified: new Date(),
      };

      vi.mocked(mockRepo.findJournalById).mockResolvedValue(existingJournal);
      vi.mocked(mockRepo.updateJournal).mockResolvedValue(existingJournal);

      const service = createJournalsService(mockRepo);
      const result = await service.updateJournal(testJournalId, testUserId, {
        userId: testUserId,
      });

      expect(result.success).toBe(true);
      expect(mockRepo.updateJournal).toHaveBeenCalledWith(testJournalId, {
        userId: testUserId,
      });
    });

    it("should return error if journal not found", async () => {
      vi.mocked(mockRepo.findJournalById).mockResolvedValue(null);

      const service = createJournalsService(mockRepo);
      const result = await service.updateJournal(testJournalId, testUserId, {
        userId: testUserId,
        title: "New Title",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Journal not found");
      }
      // Should not attempt to update
      expect(mockRepo.updateJournal).not.toHaveBeenCalled();
    });

    it("should return error if userProfileId doesn't match journal owner", async () => {
      const existingJournal = {
        id: testJournalId,
        userProfileId: "different-user-id",
        title: "Someone else's journal",
        content: {
          root: { children: [], type: "root", version: 1 },
        },
        public: false,
        createdAt: new Date(),
        lastModified: new Date(),
      };

      vi.mocked(mockRepo.findJournalById).mockResolvedValue(existingJournal);

      const service = createJournalsService(mockRepo);
      const result = await service.updateJournal(testJournalId, testUserId, {
        userId: testUserId,
        title: "Trying to update",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Unauthorized to update journal");
      }
      // Should not attempt to update
      expect(mockRepo.updateJournal).not.toHaveBeenCalled();
    });

    it("should return error when repository update returns null", async () => {
      const existingJournal = {
        id: testJournalId,
        userProfileId: testUserProfileId,
        title: "My Journal",
        content: {
          root: { children: [], type: "root", version: 1 },
        },
        public: false,
        createdAt: new Date(),
        lastModified: new Date(),
      };

      vi.mocked(mockRepo.findJournalById).mockResolvedValue(existingJournal);
      vi.mocked(mockRepo.updateJournal).mockResolvedValue(null);

      const service = createJournalsService(mockRepo);
      const result = await service.updateJournal(testJournalId, testUserId, {
        userId: testUserId,
        title: "New Title",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to update journal entry");
      }
    });

    it("should return error when repository throws error", async () => {
      const existingJournal = {
        id: testJournalId,
        userProfileId: testUserProfileId,
        title: "My Journal",
        content: {
          root: { children: [], type: "root", version: 1 },
        },
        public: false,
        createdAt: new Date(),
        lastModified: new Date(),
      };

      vi.mocked(mockRepo.findJournalById).mockResolvedValue(existingJournal);
      vi.mocked(mockRepo.updateJournal).mockRejectedValue(
        new Error("Database error"),
      );

      const service = createJournalsService(mockRepo);
      const result = await service.updateJournal(testJournalId, testUserId, {
        userId: testUserId,
        title: "New Title",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to update journal entry");
      }
    });

    it("should log error when update fails", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const existingJournal = {
        id: testJournalId,
        userProfileId: testUserProfileId,
        title: "My Journal",
        content: {
          root: { children: [], type: "root", version: 1 },
        },
        public: false,
        createdAt: new Date(),
        lastModified: new Date(),
      };

      const dbError = new Error("Database connection failed");
      vi.mocked(mockRepo.findJournalById).mockResolvedValue(existingJournal);
      vi.mocked(mockRepo.updateJournal).mockRejectedValue(dbError);

      const service = createJournalsService(mockRepo);
      await service.updateJournal(testJournalId, testUserId, {
        userId: testUserId,
        title: "New Title",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error updating journal:",
        dbError,
      );

      consoleSpy.mockRestore();
    });
  });
});
