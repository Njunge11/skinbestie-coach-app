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

describe("Journals Service - Delete Tests", () => {
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

  describe("deleteJournal", () => {
    it("should successfully delete journal when user owns it", async () => {
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
      vi.mocked(mockRepo.deleteJournal).mockResolvedValue(true);

      const service = createJournalsService(mockRepo);
      const result = await service.deleteJournal(testJournalId, testUserId);

      expect(result.success).toBe(true);
    });

    it("should return success with no data", async () => {
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
      vi.mocked(mockRepo.deleteJournal).mockResolvedValue(true);

      const service = createJournalsService(mockRepo);
      const result = await service.deleteJournal(testJournalId, testUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        // Data should be undefined for void result
        expect(result.data).toBeUndefined();
      }
    });

    it("should call repository.deleteJournal with correct ID", async () => {
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
      vi.mocked(mockRepo.deleteJournal).mockResolvedValue(true);

      const service = createJournalsService(mockRepo);
      await service.deleteJournal(testJournalId, testUserId);

      expect(mockRepo.deleteJournal).toHaveBeenCalledWith(testJournalId);
      expect(mockRepo.deleteJournal).toHaveBeenCalledTimes(1);
    });

    it("should call repository.findJournalById before deleting", async () => {
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
      vi.mocked(mockRepo.deleteJournal).mockResolvedValue(true);

      const service = createJournalsService(mockRepo);
      await service.deleteJournal(testJournalId, testUserId);

      expect(mockRepo.findJournalById).toHaveBeenCalledWith(testJournalId);
      expect(mockRepo.findJournalById).toHaveBeenCalledBefore(
        mockRepo.deleteJournal as ReturnType<typeof vi.fn>,
      );
    });

    it("should return error if journal not found", async () => {
      vi.mocked(mockRepo.findJournalById).mockResolvedValue(null);

      const service = createJournalsService(mockRepo);
      const result = await service.deleteJournal(testJournalId, testUserId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Journal not found");
      }
      // Should not attempt to delete
      expect(mockRepo.deleteJournal).not.toHaveBeenCalled();
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
      const result = await service.deleteJournal(testJournalId, testUserId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Unauthorized to delete journal");
      }
      // Should not attempt to delete
      expect(mockRepo.deleteJournal).not.toHaveBeenCalled();
    });

    it("should NOT call repository.deleteJournal if not authorized", async () => {
      const existingJournal = {
        id: testJournalId,
        userProfileId: "different-user-id",
        title: "Not mine",
        content: {
          root: { children: [], type: "root", version: 1 },
        },
        public: false,
        createdAt: new Date(),
        lastModified: new Date(),
      };

      vi.mocked(mockRepo.findJournalById).mockResolvedValue(existingJournal);

      const service = createJournalsService(mockRepo);
      await service.deleteJournal(testJournalId, testUserId);

      expect(mockRepo.deleteJournal).not.toHaveBeenCalled();
    });

    it("should return error when repository.deleteJournal returns false", async () => {
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
      vi.mocked(mockRepo.deleteJournal).mockResolvedValue(false);

      const service = createJournalsService(mockRepo);
      const result = await service.deleteJournal(testJournalId, testUserId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to delete journal entry");
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
      vi.mocked(mockRepo.deleteJournal).mockRejectedValue(
        new Error("Database error"),
      );

      const service = createJournalsService(mockRepo);
      const result = await service.deleteJournal(testJournalId, testUserId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to delete journal entry");
      }
    });

    it("should log error when delete fails", async () => {
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
      vi.mocked(mockRepo.deleteJournal).mockRejectedValue(dbError);

      const service = createJournalsService(mockRepo);
      await service.deleteJournal(testJournalId, testUserId);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error deleting journal:",
        dbError,
      );

      consoleSpy.mockRestore();
    });
  });
});
