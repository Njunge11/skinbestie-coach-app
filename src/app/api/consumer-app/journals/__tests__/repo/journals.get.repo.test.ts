import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestDatabase,
  cleanupTestDatabase,
  type TestDatabase,
} from "@/test/db-helper";
import { createJournalsRepository } from "../../journals.repo";
import * as schema from "@/lib/db/schema";
import type { PGlite } from "@electric-sql/pglite";

describe("Journals Repository - Get Tests (PGlite)", () => {
  let db: TestDatabase;
  let client: PGlite;
  let repo: ReturnType<typeof createJournalsRepository>;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testUserId2 = "660e8400-e29b-41d4-a716-446655440001";

  beforeEach(async () => {
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;

    repo = createJournalsRepository({ db });

    // Seed test users
    await db.insert(schema.userProfiles).values([
      {
        id: testUserId,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
        timezone: "America/New_York",
      },
      {
        id: testUserId2,
        firstName: "Test",
        lastName: "User2",
        email: "test2@example.com",
        phoneNumber: "+1234567891",
        dateOfBirth: new Date("1990-01-01"),
        timezone: "America/New_York",
      },
    ]);
  });

  afterEach(async () => {
    await cleanupTestDatabase(client);
  });

  describe("findJournalById", () => {
    it("should find journal by ID", async () => {
      // Create a journal
      const journal = await repo.createJournal({
        userProfileId: testUserId,
        title: "Test Journal",
        public: false,
      });

      // Find it
      const found = await repo.findJournalById(journal.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(journal.id);
      expect(found?.title).toBe("Test Journal");
    });

    it("should return journal with all fields", async () => {
      const journal = await repo.createJournal({
        userProfileId: testUserId,
        title: "Complete Journal",
        content: {
          root: {
            children: [{ text: "Content", type: "text" }],
            type: "root",
            version: 1,
          },
        },
        public: true,
      });

      const found = await repo.findJournalById(journal.id);

      expect(found).not.toBeNull();
      expect(found).toHaveProperty("id");
      expect(found).toHaveProperty("userProfileId");
      expect(found).toHaveProperty("title");
      expect(found).toHaveProperty("content");
      expect(found).toHaveProperty("public");
      expect(found).toHaveProperty("createdAt");
      expect(found).toHaveProperty("lastModified");
    });

    it("should return null when journal ID doesn't exist", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";

      const found = await repo.findJournalById(fakeId);

      expect(found).toBeNull();
    });

    it("should return correct journal (not another user's journal)", async () => {
      // Create two journals for different users
      const journal1 = await repo.createJournal({
        userProfileId: testUserId,
        title: "User 1 Journal",
      });

      const journal2 = await repo.createJournal({
        userProfileId: testUserId2,
        title: "User 2 Journal",
      });

      // Find journal1 - should get correct one
      const found = await repo.findJournalById(journal1.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(journal1.id);
      expect(found?.title).toBe("User 1 Journal");
      expect(found?.userProfileId).toBe(testUserId);
      // Should NOT be journal2
      expect(found?.id).not.toBe(journal2.id);
    });

    it("should return journal with correct data types", async () => {
      const journal = await repo.createJournal({
        userProfileId: testUserId,
        title: "Type Test",
        public: true,
      });

      const found = await repo.findJournalById(journal.id);

      expect(found).not.toBeNull();
      expect(typeof found?.id).toBe("string");
      expect(typeof found?.userProfileId).toBe("string");
      expect(typeof found?.title).toBe("string");
      expect(typeof found?.content).toBe("object");
      expect(typeof found?.public).toBe("boolean");
      expect(found?.createdAt).toBeInstanceOf(Date);
      expect(found?.lastModified).toBeInstanceOf(Date);
    });

    it("should return null for invalid UUID format", async () => {
      const invalidId = "not-a-valid-uuid";

      const found = await repo.findJournalById(invalidId);

      expect(found).toBeNull();
    });
  });
});
