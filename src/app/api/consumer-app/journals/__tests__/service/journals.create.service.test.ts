import { createMockDbSelect } from "../test-helpers";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
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

describe("Journals Service - Unit Tests", () => {
  let mockRepo: IJournalsRepository;
  const testUserId = "user-123";
  const testUserProfileId = "user-profile-123";

  beforeEach(() => {
    mockRepo = {
      createJournal: vi.fn(),
      findJournalById: vi.fn(),
      updateJournal: vi.fn(),
      deleteJournal: vi.fn(),
      findJournalsByUserProfileId: vi.fn(),
    };

    // Mock the getUserProfileId lookup by default
    vi.mocked(db.select).mockReturnValue(
      createMockDbSelect([{ id: testUserProfileId }]),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createJournal", () => {
    it("should successfully create journal with all fields", async () => {
      const mockJournal = {
        id: "journal-123",
        userProfileId: testUserProfileId,
        title: "My Journal",
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
        createdAt: new Date(),
        lastModified: new Date(),
      };

      vi.mocked(mockRepo.createJournal).mockResolvedValue(mockJournal);

      const service = createJournalsService(mockRepo);
      const result = await service.createJournal(testUserId, {
        userId: testUserId,
        title: "My Journal",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockJournal);
      }
      expect(mockRepo.createJournal).toHaveBeenCalledWith({
        userProfileId: testUserProfileId,
        title: "My Journal",
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
      });
    });

    it("should return error when user profile not found", async () => {
      // Mock no user profile found
      vi.mocked(db.select).mockReturnValue(createMockDbSelect([]));

      const service = createJournalsService(mockRepo);
      const result = await service.createJournal(testUserId, {
        userId: testUserId,
        title: "My Journal",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User profile not found");
      }
      expect(mockRepo.createJournal).not.toHaveBeenCalled();
    });

    it("should apply default title when not provided", async () => {
      const mockJournal = {
        id: "journal-123",
        userProfileId: testUserProfileId,
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
        createdAt: new Date(),
        lastModified: new Date(),
      };

      vi.mocked(mockRepo.createJournal).mockResolvedValue(mockJournal);

      const service = createJournalsService(mockRepo);
      const result = await service.createJournal(testUserId, {
        userId: testUserId,
      });

      expect(result.success).toBe(true);
      expect(mockRepo.createJournal).toHaveBeenCalledWith({
        userProfileId: testUserProfileId,
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
      });
    });

    it("should apply default content when not provided", async () => {
      const mockJournal = {
        id: "journal-123",
        userProfileId: testUserProfileId,
        title: "My Journal",
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
        createdAt: new Date(),
        lastModified: new Date(),
      };

      vi.mocked(mockRepo.createJournal).mockResolvedValue(mockJournal);

      const service = createJournalsService(mockRepo);
      const result = await service.createJournal(testUserId, {
        userId: testUserId,
        title: "My Journal",
      });

      expect(result.success).toBe(true);
      expect(mockRepo.createJournal).toHaveBeenCalledWith({
        userProfileId: testUserProfileId,
        title: "My Journal",
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
      });
    });

    it("should apply default content when empty object provided", async () => {
      const mockJournal = {
        id: "journal-123",
        userProfileId: testUserProfileId,
        title: "My Journal",
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
        createdAt: new Date(),
        lastModified: new Date(),
      };

      vi.mocked(mockRepo.createJournal).mockResolvedValue(mockJournal);

      const service = createJournalsService(mockRepo);
      const result = await service.createJournal(testUserId, {
        userId: testUserId,
        title: "My Journal",
        content: {},
      });

      expect(result.success).toBe(true);
      expect(mockRepo.createJournal).toHaveBeenCalledWith({
        userProfileId: testUserProfileId,
        title: "My Journal",
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
      });
    });

    it("should use provided content when valid Lexical JSON provided", async () => {
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
                  text: "Hello World",
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
        id: "journal-123",
        userProfileId: testUserProfileId,
        title: "My Journal",
        content: customContent,
        public: false,
        createdAt: new Date(),
        lastModified: new Date(),
      };

      vi.mocked(mockRepo.createJournal).mockResolvedValue(mockJournal);

      const service = createJournalsService(mockRepo);
      const result = await service.createJournal(testUserId, {
        userId: testUserId,
        title: "My Journal",
        content: customContent,
      });

      expect(result.success).toBe(true);
      expect(mockRepo.createJournal).toHaveBeenCalledWith({
        userProfileId: testUserProfileId,
        title: "My Journal",
        content: customContent,
        public: false,
      });
    });

    it("should apply default public flag when not provided", async () => {
      const mockJournal = {
        id: "journal-123",
        userProfileId: testUserProfileId,
        title: "My Journal",
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
        createdAt: new Date(),
        lastModified: new Date(),
      };

      vi.mocked(mockRepo.createJournal).mockResolvedValue(mockJournal);

      const service = createJournalsService(mockRepo);
      const result = await service.createJournal(testUserId, {
        userId: testUserId,
        title: "My Journal",
      });

      expect(result.success).toBe(true);
      expect(mockRepo.createJournal).toHaveBeenCalledWith({
        userProfileId: testUserProfileId,
        title: "My Journal",
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
      });
    });

    it("should use provided public flag when true", async () => {
      const mockJournal = {
        id: "journal-123",
        userProfileId: testUserProfileId,
        title: "My Journal",
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
        createdAt: new Date(),
        lastModified: new Date(),
      };

      vi.mocked(mockRepo.createJournal).mockResolvedValue(mockJournal);

      const service = createJournalsService(mockRepo);
      const result = await service.createJournal(testUserId, {
        userId: testUserId,
        title: "My Journal",
        public: true,
      });

      expect(result.success).toBe(true);
      expect(mockRepo.createJournal).toHaveBeenCalledWith({
        userProfileId: testUserProfileId,
        title: "My Journal",
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
      });
    });

    it("should return error when repository throws exception", async () => {
      vi.mocked(mockRepo.createJournal).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const service = createJournalsService(mockRepo);
      const result = await service.createJournal(testUserId, {
        userId: testUserId,
        title: "My Journal",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to create journal entry");
      }
    });
  });
});
