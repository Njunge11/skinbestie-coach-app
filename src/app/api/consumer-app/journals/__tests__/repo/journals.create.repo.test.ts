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

describe("Journals Repository - Integration Tests (PGlite)", () => {
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

  describe("createJournal", () => {
    it("should create journal in database with defaults", async () => {
      const journal = await repo.createJournal({
        userProfileId: testUserId,
      });

      expect(journal.id).toBeDefined();
      expect(journal.userProfileId).toBe(testUserId);
      expect(journal.title).toBe("Untitled Journal Entry");
      expect(journal.public).toBe(false);
      expect(journal.content).toEqual({
        root: {
          children: [],
          direction: "ltr",
          format: "",
          indent: 0,
          type: "root",
          version: 1,
        },
      });
      expect(journal.createdAt).toBeInstanceOf(Date);
      expect(journal.lastModified).toBeInstanceOf(Date);

      // Verify in database
      const result = await db
        .select()
        .from(schema.journals)
        .where(eq(schema.journals.id, journal.id));

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Untitled Journal Entry");
    });

    it("should create journal with custom title and verify in DB", async () => {
      const journal = await repo.createJournal({
        userProfileId: testUserId,
        title: "My Custom Title",
      });

      expect(journal.title).toBe("My Custom Title");

      // Verify in database
      const result = await db
        .select()
        .from(schema.journals)
        .where(eq(schema.journals.id, journal.id));

      expect(result[0].title).toBe("My Custom Title");
    });

    it("should create journal with custom Lexical content and verify in DB", async () => {
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

      const journal = await repo.createJournal({
        userProfileId: testUserId,
        content: customContent,
      });

      expect(journal.content).toEqual(customContent);

      // Verify in database
      const result = await db
        .select()
        .from(schema.journals)
        .where(eq(schema.journals.id, journal.id));

      expect(result[0].content).toEqual(customContent);
    });

    it("should create public journal and verify public flag in DB", async () => {
      const journal = await repo.createJournal({
        userProfileId: testUserId,
        public: true,
      });

      expect(journal.public).toBe(true);

      // Verify in database
      const result = await db
        .select()
        .from(schema.journals)
        .where(eq(schema.journals.id, journal.id));

      expect(result[0].public).toBe(true);
    });

    it("should auto-generate UUID for journal ID", async () => {
      const journal = await repo.createJournal({
        userProfileId: testUserId,
      });

      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(journal.id).toMatch(uuidPattern);
    });

    it("should auto-generate createdAt timestamp", async () => {
      const before = new Date();
      const journal = await repo.createJournal({
        userProfileId: testUserId,
      });
      const after = new Date();

      const createdAt = new Date(journal.createdAt);
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should set lastModified equal to createdAt on creation", async () => {
      const journal = await repo.createJournal({
        userProfileId: testUserId,
      });

      expect(journal.createdAt.getTime()).toBe(journal.lastModified.getTime());
    });

    it("should verify response matches database record", async () => {
      const journal = await repo.createJournal({
        userProfileId: testUserId,
        title: "Test Journal",
        public: true,
      });

      // Verify in database
      const result = await db
        .select()
        .from(schema.journals)
        .where(eq(schema.journals.id, journal.id));

      const dbRecord = result[0];

      expect(journal.id).toBe(dbRecord.id);
      expect(journal.title).toBe(dbRecord.title);
      expect(journal.content).toEqual(dbRecord.content);
      expect(journal.public).toBe(dbRecord.public);
      expect(new Date(journal.createdAt).getTime()).toBe(
        dbRecord.createdAt.getTime(),
      );
      expect(new Date(journal.lastModified).getTime()).toBe(
        dbRecord.lastModified.getTime(),
      );
    });
  });

  describe("Database Constraints", () => {
    it("should fail if userProfileId references non-existent user (FK constraint)", async () => {
      const nonExistentUserId = "999e8400-e29b-41d4-a716-446655440999";

      await expect(
        repo.createJournal({
          userProfileId: nonExistentUserId,
        }),
      ).rejects.toThrow();
    });

    it("should cascade delete journal when user profile is deleted", async () => {
      // Create journal
      const journal = await repo.createJournal({
        userProfileId: testUserId,
      });

      // Verify journal exists
      let result = await db
        .select()
        .from(schema.journals)
        .where(eq(schema.journals.id, journal.id));
      expect(result).toHaveLength(1);

      // Delete user profile
      await db
        .delete(schema.userProfiles)
        .where(eq(schema.userProfiles.id, testUserId));

      // Verify journal was cascade deleted
      result = await db
        .select()
        .from(schema.journals)
        .where(eq(schema.journals.id, journal.id));
      expect(result).toHaveLength(0);
    });
  });

  describe("Default Values", () => {
    it('should use "Untitled Journal Entry" as default title', async () => {
      const journal = await repo.createJournal({
        userProfileId: testUserId,
      });

      // Verify in database
      const result = await db
        .select()
        .from(schema.journals)
        .where(eq(schema.journals.id, journal.id));

      expect(result[0].title).toBe("Untitled Journal Entry");
    });

    it("should use empty Lexical content as default", async () => {
      const journal = await repo.createJournal({
        userProfileId: testUserId,
      });

      const expectedDefaultContent = {
        root: {
          children: [],
          direction: "ltr",
          format: "",
          indent: 0,
          type: "root",
          version: 1,
        },
      };

      // Verify in database
      const result = await db
        .select()
        .from(schema.journals)
        .where(eq(schema.journals.id, journal.id));

      expect(result[0].content).toEqual(expectedDefaultContent);
    });

    it("should use false as default for public field", async () => {
      const journal = await repo.createJournal({
        userProfileId: testUserId,
      });

      // Verify in database
      const result = await db
        .select()
        .from(schema.journals)
        .where(eq(schema.journals.id, journal.id));

      expect(result[0].public).toBe(false);
    });
  });
});
