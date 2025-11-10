import { describe, it, expect, beforeEach, vi } from "vitest";
import { createJournalsService } from "../../journals.service";
import type { IJournalsRepository } from "../../journals.repo";
import type { Journal } from "@/lib/db/schema";

// Mock repository
const mockRepo: IJournalsRepository = {
  createJournal: vi.fn(),
  findJournalById: vi.fn(),
  updateJournal: vi.fn(),
  deleteJournal: vi.fn(),
  findJournalsByUserProfileId: vi.fn(),
};

describe("Journals Service - List Tests", () => {
  let service: ReturnType<typeof createJournalsService>;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";

  const mockJournals: Journal[] = [
    {
      id: "journal-1",
      userProfileId: testUserId,
      title: "First Journal",
      content: {
        root: {
          children: [
            {
              children: [
                {
                  text: "This is the first journal entry with some content that is longer than 100 characters to test truncation properly",
                  type: "text",
                },
              ],
              type: "paragraph",
            },
          ],
          type: "root",
          version: 1,
        },
      },
      public: true,
      createdAt: new Date("2025-11-08T10:00:00Z"),
      lastModified: new Date("2025-11-08T10:00:00Z"),
    },
    {
      id: "journal-2",
      userProfileId: testUserId,
      title: "Second Journal",
      content: {
        root: {
          children: [
            {
              children: [
                { text: "This is the second journal entry", type: "text" },
              ],
              type: "paragraph",
            },
          ],
          type: "root",
          version: 1,
        },
      },
      public: false,
      createdAt: new Date("2025-11-07T09:00:00Z"),
      lastModified: new Date("2025-11-07T09:00:00Z"),
    },
    {
      id: "journal-3",
      userProfileId: testUserId,
      title: "Third Journal",
      content: {
        root: {
          children: [
            {
              children: [{ text: "Short text", type: "text" }],
              type: "paragraph",
            },
          ],
          type: "root",
          version: 1,
        },
      },
      public: true,
      createdAt: new Date("2025-11-06T08:00:00Z"),
      lastModified: new Date("2025-11-06T08:00:00Z"),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    service = createJournalsService(mockRepo);
  });

  describe("listJournals", () => {
    it("should return journals with first item having content, rest null", async () => {
      vi.mocked(mockRepo.findJournalsByUserProfileId).mockResolvedValue(
        mockJournals,
      );

      const result = await service.listJournals({
        userProfileId: testUserId,
        limit: 20,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.journals).toHaveLength(3);
        // First has content
        expect(result.data.journals[0].content).not.toBeNull();
        expect(result.data.journals[0].content).toEqual(
          mockJournals[0].content,
        );
        // Rest have null content
        expect(result.data.journals[1].content).toBeNull();
        expect(result.data.journals[2].content).toBeNull();
      }
    });

    it("should generate 100-char preview for all journals", async () => {
      vi.mocked(mockRepo.findJournalsByUserProfileId).mockResolvedValue(
        mockJournals,
      );

      const result = await service.listJournals({
        userProfileId: testUserId,
        limit: 20,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        // All should have previews
        expect(result.data.journals[0].preview).toBeDefined();
        expect(result.data.journals[1].preview).toBeDefined();
        expect(result.data.journals[2].preview).toBeDefined();

        // Previews should not exceed 100 chars
        expect(result.data.journals[0].preview.length).toBeLessThanOrEqual(100);
        expect(result.data.journals[1].preview.length).toBeLessThanOrEqual(100);
        expect(result.data.journals[2].preview.length).toBeLessThanOrEqual(100);
      }
    });

    it("should return pagination metadata with nextCursor", async () => {
      vi.mocked(mockRepo.findJournalsByUserProfileId).mockResolvedValue(
        mockJournals,
      );

      const result = await service.listJournals({
        userProfileId: testUserId,
        limit: 20,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pagination).toBeDefined();
        expect(result.data.pagination).toHaveProperty("nextCursor");
        expect(result.data.pagination).toHaveProperty("hasMore");
        expect(result.data.pagination).toHaveProperty("limit");
      }
    });

    it("should return hasMore=true when more journals exist", async () => {
      // Return exactly limit journals (suggests more might exist)
      const limitedJournals = Array.from({ length: 20 }, (_, i) => ({
        ...mockJournals[0],
        id: `journal-${i}`,
      }));

      vi.mocked(mockRepo.findJournalsByUserProfileId).mockResolvedValue(
        limitedJournals,
      );

      const result = await service.listJournals({
        userProfileId: testUserId,
        limit: 20,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pagination.hasMore).toBe(true);
      }
    });

    it("should return hasMore=false when no more journals exist", async () => {
      // Return fewer than limit
      vi.mocked(mockRepo.findJournalsByUserProfileId).mockResolvedValue(
        mockJournals.slice(0, 2),
      );

      const result = await service.listJournals({
        userProfileId: testUserId,
        limit: 20,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pagination.hasMore).toBe(false);
      }
    });

    it("should return nextCursor=null when no more journals exist", async () => {
      // Return fewer than limit
      vi.mocked(mockRepo.findJournalsByUserProfileId).mockResolvedValue(
        mockJournals.slice(0, 2),
      );

      const result = await service.listJournals({
        userProfileId: testUserId,
        limit: 20,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pagination.nextCursor).toBeNull();
      }
    });

    it("should extract plain text from Lexical JSON for preview", async () => {
      vi.mocked(mockRepo.findJournalsByUserProfileId).mockResolvedValue([
        mockJournals[0],
      ]);

      const result = await service.listJournals({
        userProfileId: testUserId,
        limit: 20,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const preview = result.data.journals[0].preview;
        // Should extract the text content
        expect(preview).toContain("This is the first journal entry");
        // Should not contain JSON structure
        expect(preview).not.toContain("root");
        expect(preview).not.toContain("children");
      }
    });

    it("should truncate preview to 100 characters", async () => {
      vi.mocked(mockRepo.findJournalsByUserProfileId).mockResolvedValue([
        mockJournals[0],
      ]);

      const result = await service.listJournals({
        userProfileId: testUserId,
        limit: 20,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const preview = result.data.journals[0].preview;
        expect(preview.length).toBe(100);
        // Should end with ellipsis if truncated
        expect(preview.endsWith("...")).toBe(true);
      }
    });

    it("should handle empty Lexical content gracefully (empty preview)", async () => {
      const emptyContentJournal: Journal = {
        ...mockJournals[0],
        content: {
          root: {
            children: [],
            type: "root",
            version: 1,
          },
        },
      };

      vi.mocked(mockRepo.findJournalsByUserProfileId).mockResolvedValue([
        emptyContentJournal,
      ]);

      const result = await service.listJournals({
        userProfileId: testUserId,
        limit: 20,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.journals[0].preview).toBe("");
      }
    });

    it("should handle Lexical content with no text nodes", async () => {
      const noTextJournal: Journal = {
        ...mockJournals[0],
        content: {
          root: {
            children: [
              {
                type: "paragraph",
                children: [],
              },
            ],
            type: "root",
            version: 1,
          },
        },
      };

      vi.mocked(mockRepo.findJournalsByUserProfileId).mockResolvedValue([
        noTextJournal,
      ]);

      const result = await service.listJournals({
        userProfileId: testUserId,
        limit: 20,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.journals[0].preview).toBe("");
      }
    });

    it("should decode base64 cursor and pass to repository", async () => {
      const cursor = {
        lastModified: new Date("2025-11-07T09:00:00Z"),
        id: "journal-2",
      };
      const encodedCursor = Buffer.from(JSON.stringify(cursor)).toString(
        "base64",
      );

      vi.mocked(mockRepo.findJournalsByUserProfileId).mockResolvedValue([
        mockJournals[2],
      ]);

      await service.listJournals({
        userProfileId: testUserId,
        cursor: encodedCursor,
        limit: 20,
      });

      expect(mockRepo.findJournalsByUserProfileId).toHaveBeenCalledWith({
        userProfileId: testUserId,
        cursor: expect.objectContaining({
          id: "journal-2",
        }),
        limit: 20,
      });
    });

    it("should encode cursor from last journal's lastModified + id", async () => {
      vi.mocked(mockRepo.findJournalsByUserProfileId).mockResolvedValue(
        mockJournals,
      );

      const result = await service.listJournals({
        userProfileId: testUserId,
        limit: 20,
      });

      expect(result.success).toBe(true);
      if (result.success && result.data.pagination.nextCursor) {
        // Decode the cursor to verify it contains last journal's data
        const decoded = JSON.parse(
          Buffer.from(result.data.pagination.nextCursor, "base64").toString(),
        );
        expect(decoded.id).toBe(mockJournals[mockJournals.length - 1].id);
      }
    });

    it("should return null cursor when result is empty", async () => {
      vi.mocked(mockRepo.findJournalsByUserProfileId).mockResolvedValue([]);

      const result = await service.listJournals({
        userProfileId: testUserId,
        limit: 20,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pagination.nextCursor).toBeNull();
      }
    });

    it("should return error when repository throws exception", async () => {
      vi.mocked(mockRepo.findJournalsByUserProfileId).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await service.listJournals({
        userProfileId: testUserId,
        limit: 20,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to retrieve journals");
      }
    });
  });
});
