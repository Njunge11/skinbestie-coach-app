import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestDatabase,
  cleanupTestDatabase,
  type TestDatabase,
} from "@/test/db-helper";
import { createJournalsRepository } from "../../journals.repo";
import * as schema from "@/lib/db/schema";
import type { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";

describe("Journals Repository - Update Tests (PGlite)", () => {
  let db: TestDatabase;
  let client: PGlite;
  let repo: ReturnType<typeof createJournalsRepository>;

  // Test UUIDs
  const testUserId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(async () => {
    // Create fresh in-memory database for each test
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;

    // Create repository with test database
    repo = createJournalsRepository({ db });

    // Seed test user
    await db.insert(schema.userProfiles).values({
      id: testUserId,
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      phoneNumber: "+1234567890",
      dateOfBirth: new Date("1990-01-01"),
      timezone: "America/New_York",
    });
  });

  afterEach(async () => {
    await cleanupTestDatabase(client);
  });

  describe("updateJournal", () => {
    it("should update journal title in database", async () => {
      // Create a journal first
      const journal = await repo.createJournal({
        userProfileId: testUserId,
        title: "Original Title",
      });

      // Update the title
      const updated = await repo.updateJournal(journal.id, {
        title: "Updated Title",
      });

      expect(updated).toBeDefined();
      expect(updated?.title).toBe("Updated Title");
      expect(updated?.id).toBe(journal.id);
    });

    it("should update journal content in database", async () => {
      // Create a journal first
      const journal = await repo.createJournal({
        userProfileId: testUserId,
      });

      const newContent = {
        root: {
          children: [
            {
              children: [
                {
                  text: "New content",
                  type: "text",
                },
              ],
              type: "paragraph",
            },
          ],
          type: "root",
          version: 1,
        },
      };

      // Update the content
      const updated = await repo.updateJournal(journal.id, {
        content: newContent,
      });

      expect(updated).toBeDefined();
      expect(updated?.content).toEqual(newContent);
    });

    it("should update journal public flag in database", async () => {
      // Create a journal first (default public = false)
      const journal = await repo.createJournal({
        userProfileId: testUserId,
      });

      // Update public flag
      const updated = await repo.updateJournal(journal.id, {
        public: true,
      });

      expect(updated).toBeDefined();
      expect(updated?.public).toBe(true);
    });

    it("should update multiple fields in database", async () => {
      // Create a journal first
      const journal = await repo.createJournal({
        userProfileId: testUserId,
        title: "Old Title",
      });

      const newContent = {
        root: {
          children: [{ text: "New", type: "text" }],
          type: "root",
          version: 1,
        },
      };

      // Update multiple fields
      const updated = await repo.updateJournal(journal.id, {
        title: "New Title",
        content: newContent,
        public: true,
      });

      expect(updated).toBeDefined();
      expect(updated?.title).toBe("New Title");
      expect(updated?.content).toEqual(newContent);
      expect(updated?.public).toBe(true);
    });

    it("should return updated journal with all fields", async () => {
      // Create a journal first
      const journal = await repo.createJournal({
        userProfileId: testUserId,
      });

      // Update
      const updated = await repo.updateJournal(journal.id, {
        title: "Updated",
      });

      expect(updated).toHaveProperty("id");
      expect(updated).toHaveProperty("userProfileId");
      expect(updated).toHaveProperty("title");
      expect(updated).toHaveProperty("content");
      expect(updated).toHaveProperty("public");
      expect(updated).toHaveProperty("createdAt");
      expect(updated).toHaveProperty("lastModified");
    });

    it("should update lastModified timestamp on update", async () => {
      // Create a journal first
      const journal = await repo.createJournal({
        userProfileId: testUserId,
      });

      const originalLastModified = journal.lastModified;

      // Wait a tiny bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Update
      const updated = await repo.updateJournal(journal.id, {
        title: "Updated",
      });

      expect(updated).toBeDefined();
      expect(updated?.lastModified.getTime()).toBeGreaterThan(
        originalLastModified.getTime(),
      );
    });

    it("should NOT change createdAt timestamp on update", async () => {
      // Create a journal first
      const journal = await repo.createJournal({
        userProfileId: testUserId,
      });

      const originalCreatedAt = journal.createdAt;

      // Update
      const updated = await repo.updateJournal(journal.id, {
        title: "Updated",
      });

      expect(updated).toBeDefined();
      expect(updated?.createdAt.getTime()).toBe(originalCreatedAt.getTime());
    });

    it("should set lastModified to current time (not same as createdAt)", async () => {
      // Create a journal first
      const journal = await repo.createJournal({
        userProfileId: testUserId,
      });

      // Wait to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Update
      const updated = await repo.updateJournal(journal.id, {
        title: "Updated",
      });

      expect(updated).toBeDefined();
      expect(updated?.lastModified.getTime()).toBeGreaterThan(
        updated!.createdAt.getTime(),
      );
    });

    it("should return null if journal ID doesn't exist", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";

      const result = await repo.updateJournal(fakeId, {
        title: "Updated",
      });

      expect(result).toBeNull();
    });

    it("should maintain foreign key relationship after update", async () => {
      // Create a journal first
      const journal = await repo.createJournal({
        userProfileId: testUserId,
      });

      // Update
      const updated = await repo.updateJournal(journal.id, {
        title: "Updated",
      });

      expect(updated).toBeDefined();
      expect(updated?.userProfileId).toBe(testUserId);
    });

    it("should verify updated data persists in database", async () => {
      // Create a journal first
      const journal = await repo.createJournal({
        userProfileId: testUserId,
        title: "Original",
      });

      // Update
      await repo.updateJournal(journal.id, {
        title: "Updated Title",
      });

      // Query database directly
      const [dbJournal] = await db
        .select()
        .from(schema.journals)
        .where(eq(schema.journals.id, journal.id));

      expect(dbJournal.title).toBe("Updated Title");
    });

    it("should handle updating to same values (idempotent)", async () => {
      // Create a journal first
      const journal = await repo.createJournal({
        userProfileId: testUserId,
        title: "Same Title",
      });

      // Update with same value
      const updated = await repo.updateJournal(journal.id, {
        title: "Same Title",
      });

      expect(updated).toBeDefined();
      expect(updated?.title).toBe("Same Title");
      // lastModified should still be updated
      expect(updated?.lastModified.getTime()).toBeGreaterThanOrEqual(
        journal.lastModified.getTime(),
      );
    });

    it("should preserve fields not included in update", async () => {
      const originalContent = {
        root: {
          children: [{ text: "Original", type: "text" }],
          type: "root",
          version: 1,
        },
      };

      // Create a journal with specific content
      const journal = await repo.createJournal({
        userProfileId: testUserId,
        title: "Original Title",
        content: originalContent,
        public: true,
      });

      // Update only title
      const updated = await repo.updateJournal(journal.id, {
        title: "New Title",
      });

      expect(updated).toBeDefined();
      expect(updated?.title).toBe("New Title");
      // These should remain unchanged
      expect(updated?.content).toEqual(originalContent);
      expect(updated?.public).toBe(true);
    });

    it("should maintain valid Lexical JSON structure after update", async () => {
      // Create a journal
      const journal = await repo.createJournal({
        userProfileId: testUserId,
      });

      const validLexicalContent = {
        root: {
          children: [
            {
              children: [
                {
                  detail: 0,
                  format: 0,
                  mode: "normal",
                  style: "",
                  text: "Test content",
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

      // Update with valid Lexical content
      const updated = await repo.updateJournal(journal.id, {
        content: validLexicalContent,
      });

      expect(updated).toBeDefined();
      expect(updated?.content).toEqual(validLexicalContent);
      if (updated?.content && typeof updated.content === "object") {
        const content = updated.content as { root?: { type?: string } };
        expect(content.root).toBeDefined();
        expect(content.root?.type).toBe("root");
      }
    });

    it("should verify response matches actual database record after update", async () => {
      // Create a journal
      const journal = await repo.createJournal({
        userProfileId: testUserId,
      });

      // Update
      const updated = await repo.updateJournal(journal.id, {
        title: "Updated Title",
        public: true,
      });

      // Query database directly
      const [dbJournal] = await db
        .select()
        .from(schema.journals)
        .where(eq(schema.journals.id, journal.id));

      expect(updated?.id).toBe(dbJournal.id);
      expect(updated?.title).toBe(dbJournal.title);
      expect(updated?.content).toEqual(dbJournal.content);
      expect(updated?.public).toBe(dbJournal.public);
      expect(updated?.userProfileId).toBe(dbJournal.userProfileId);
      expect(updated?.createdAt.getTime()).toBe(dbJournal.createdAt.getTime());
      expect(updated?.lastModified.getTime()).toBe(
        dbJournal.lastModified.getTime(),
      );
    });
  });

  describe("findJournalById", () => {
    it("should find journal by ID", async () => {
      // Create a journal
      const journal = await repo.createJournal({
        userProfileId: testUserId,
        title: "Test Journal",
      });

      // Find it
      const found = await repo.findJournalById(journal.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(journal.id);
      expect(found?.title).toBe("Test Journal");
    });

    it("should return null if journal not found", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";

      const found = await repo.findJournalById(fakeId);

      expect(found).toBeNull();
    });
  });
});
