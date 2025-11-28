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

describe("Journals Repository - List Tests (PGlite)", () => {
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

  describe("findJournalsByUserProfileId", () => {
    it("should return journals for user ordered by lastModified DESC", async () => {
      // Create journals then set different lastModified times
      const journal1 = await repo.createJournal({
        userProfileId: testUserId,
        title: "First",
      });

      const journal2 = await repo.createJournal({
        userProfileId: testUserId,
        title: "Second",
      });

      const journal3 = await repo.createJournal({
        userProfileId: testUserId,
        title: "Third",
      });

      // Set explicit lastModified times for ordering
      const baseTime = new Date("2025-01-01T12:00:00Z");
      await db
        .update(schema.journals)
        .set({ lastModified: new Date(baseTime.getTime()) })
        .where(eq(schema.journals.id, journal1.id));
      await db
        .update(schema.journals)
        .set({ lastModified: new Date(baseTime.getTime() + 1000) })
        .where(eq(schema.journals.id, journal2.id));
      await db
        .update(schema.journals)
        .set({ lastModified: new Date(baseTime.getTime() + 2000) })
        .where(eq(schema.journals.id, journal3.id));

      const result = await repo.findJournalsByUserProfileId({
        userProfileId: testUserId,
        limit: 20,
      });

      expect(result).toHaveLength(3);
      // Most recent first
      expect(result[0].id).toBe(journal3.id);
      expect(result[1].id).toBe(journal2.id);
      expect(result[2].id).toBe(journal1.id);
    });

    it("should return journals ordered by lastModified DESC, then id DESC for tie-breaking", async () => {
      // Create journals at same time, then update them
      await repo.createJournal({
        userProfileId: testUserId,
        title: "Journal 1",
      });

      await repo.createJournal({
        userProfileId: testUserId,
        title: "Journal 2",
      });

      await repo.createJournal({
        userProfileId: testUserId,
        title: "Journal 3",
      });

      // Update all to same lastModified time by updating them together
      const now = new Date();
      await db
        .update(schema.journals)
        .set({ lastModified: now })
        .where(eq(schema.journals.userProfileId, testUserId));

      const result = await repo.findJournalsByUserProfileId({
        userProfileId: testUserId,
        limit: 20,
      });

      expect(result).toHaveLength(3);
      // When lastModified is same, should order by id DESC
      expect(result[0].lastModified.getTime()).toBe(now.getTime());
      expect(result[1].lastModified.getTime()).toBe(now.getTime());
      expect(result[2].lastModified.getTime()).toBe(now.getTime());

      // IDs should be in descending order
      expect(result[0].id > result[1].id).toBe(true);
      expect(result[1].id > result[2].id).toBe(true);
    });

    it("should return empty array when user has no journals", async () => {
      const result = await repo.findJournalsByUserProfileId({
        userProfileId: testUserId,
        limit: 20,
      });

      expect(result).toEqual([]);
    });

    it("should only return journals for specified userProfileId (user isolation)", async () => {
      // Create journals for user 1
      await repo.createJournal({
        userProfileId: testUserId,
        title: "User 1 Journal 1",
      });

      await repo.createJournal({
        userProfileId: testUserId,
        title: "User 1 Journal 2",
      });

      // Create journals for user 2
      await repo.createJournal({
        userProfileId: testUserId2,
        title: "User 2 Journal 1",
      });

      const result = await repo.findJournalsByUserProfileId({
        userProfileId: testUserId,
        limit: 20,
      });

      expect(result).toHaveLength(2);
      expect(result.every((j) => j.userProfileId === testUserId)).toBe(true);
    });

    it("should return first page when no cursor provided", async () => {
      // Create 5 journals with explicit ordering
      const baseTime = new Date("2025-01-01T12:00:00Z");
      for (let i = 1; i <= 5; i++) {
        const journal = await repo.createJournal({
          userProfileId: testUserId,
          title: `Journal ${i}`,
        });
        await db
          .update(schema.journals)
          .set({ lastModified: new Date(baseTime.getTime() + i * 1000) })
          .where(eq(schema.journals.id, journal.id));
      }

      const result = await repo.findJournalsByUserProfileId({
        userProfileId: testUserId,
        limit: 3,
      });

      expect(result).toHaveLength(3);
    });

    it("should return second page when cursor provided", async () => {
      // Create 5 journals with explicit ordering
      const baseTime = new Date("2025-01-01T12:00:00Z");
      const journals = [];
      for (let i = 1; i <= 5; i++) {
        const journal = await repo.createJournal({
          userProfileId: testUserId,
          title: `Journal ${i}`,
        });
        await db
          .update(schema.journals)
          .set({ lastModified: new Date(baseTime.getTime() + i * 1000) })
          .where(eq(schema.journals.id, journal.id));
        journals.push(journal);
      }

      // Get first page
      const firstPage = await repo.findJournalsByUserProfileId({
        userProfileId: testUserId,
        limit: 2,
      });

      expect(firstPage).toHaveLength(2);

      // Get second page using cursor from last item of first page
      const cursor = {
        lastModified: firstPage[1].lastModified,
        id: firstPage[1].id,
      };

      const secondPage = await repo.findJournalsByUserProfileId({
        userProfileId: testUserId,
        cursor,
        limit: 2,
      });

      expect(secondPage).toHaveLength(2);
      // Should not include items from first page
      expect(secondPage.some((j) => j.id === firstPage[0].id)).toBe(false);
      expect(secondPage.some((j) => j.id === firstPage[1].id)).toBe(false);
    });

    it("should return empty array when cursor points to last item", async () => {
      // Create 3 journals with explicit ordering
      const baseTime = new Date("2025-01-01T12:00:00Z");
      for (let i = 1; i <= 3; i++) {
        const journal = await repo.createJournal({
          userProfileId: testUserId,
          title: `Journal ${i}`,
        });
        await db
          .update(schema.journals)
          .set({ lastModified: new Date(baseTime.getTime() + i * 1000) })
          .where(eq(schema.journals.id, journal.id));
      }

      // Get all journals
      const allJournals = await repo.findJournalsByUserProfileId({
        userProfileId: testUserId,
        limit: 20,
      });

      // Use last journal as cursor
      const lastJournal = allJournals[allJournals.length - 1];
      const cursor = {
        lastModified: lastJournal.lastModified,
        id: lastJournal.id,
      };

      const result = await repo.findJournalsByUserProfileId({
        userProfileId: testUserId,
        cursor,
        limit: 20,
      });

      expect(result).toEqual([]);
    });

    it("should handle cursor with same lastModified timestamps correctly (tie-breaking with id)", async () => {
      // Create 5 journals
      for (let i = 1; i <= 5; i++) {
        await repo.createJournal({
          userProfileId: testUserId,
          title: `Journal ${i}`,
        });
      }

      // Set same lastModified for all
      const now = new Date();
      await db
        .update(schema.journals)
        .set({ lastModified: now })
        .where(eq(schema.journals.userProfileId, testUserId));

      // Get first page
      const firstPage = await repo.findJournalsByUserProfileId({
        userProfileId: testUserId,
        limit: 2,
      });

      expect(firstPage).toHaveLength(2);

      // Get second page
      const cursor = {
        lastModified: firstPage[1].lastModified,
        id: firstPage[1].id,
      };

      const secondPage = await repo.findJournalsByUserProfileId({
        userProfileId: testUserId,
        cursor,
        limit: 2,
      });

      expect(secondPage).toHaveLength(2);
      // Should not overlap with first page
      expect(secondPage.some((j) => j.id === firstPage[0].id)).toBe(false);
      expect(secondPage.some((j) => j.id === firstPage[1].id)).toBe(false);
      // All should have same lastModified
      expect(secondPage[0].lastModified.getTime()).toBe(now.getTime());
    });

    it("should respect limit parameter (fetch 5 journals with limit=5)", async () => {
      // Create 10 journals
      for (let i = 1; i <= 10; i++) {
        await repo.createJournal({
          userProfileId: testUserId,
          title: `Journal ${i}`,
        });
      }

      const result = await repo.findJournalsByUserProfileId({
        userProfileId: testUserId,
        limit: 5,
      });

      expect(result).toHaveLength(5);
    });

    it("should default to 20 when limit not specified", async () => {
      // Create 25 journals
      for (let i = 1; i <= 25; i++) {
        await repo.createJournal({
          userProfileId: testUserId,
          title: `Journal ${i}`,
        });
      }

      const result = await repo.findJournalsByUserProfileId({
        userProfileId: testUserId,
        limit: 20, // Repository layer should use 20 as default
      });

      expect(result).toHaveLength(20);
    });

    it("should return fewer than limit if not enough journals exist", async () => {
      // Create only 3 journals
      for (let i = 1; i <= 3; i++) {
        await repo.createJournal({
          userProfileId: testUserId,
          title: `Journal ${i}`,
        });
      }

      const result = await repo.findJournalsByUserProfileId({
        userProfileId: testUserId,
        limit: 10,
      });

      expect(result).toHaveLength(3);
    });

    it("should return journals with all fields (id, title, content, public, createdAt, lastModified)", async () => {
      await repo.createJournal({
        userProfileId: testUserId,
        title: "Test Journal",
        content: {
          root: {
            children: [{ text: "Test content", type: "text" }],
            type: "root",
            version: 1,
          },
        },
        public: true,
      });

      const result = await repo.findJournalsByUserProfileId({
        userProfileId: testUserId,
        limit: 20,
      });

      expect(result).toHaveLength(1);
      const journal = result[0];

      expect(journal).toHaveProperty("id");
      expect(journal).toHaveProperty("userProfileId");
      expect(journal).toHaveProperty("title");
      expect(journal).toHaveProperty("content");
      expect(journal).toHaveProperty("public");
      expect(journal).toHaveProperty("createdAt");
      expect(journal).toHaveProperty("lastModified");
    });

    it("should return correct data types for all fields", async () => {
      await repo.createJournal({
        userProfileId: testUserId,
        title: "Test Journal",
        public: true,
      });

      const result = await repo.findJournalsByUserProfileId({
        userProfileId: testUserId,
        limit: 20,
      });

      expect(result).toHaveLength(1);
      const journal = result[0];

      expect(typeof journal.id).toBe("string");
      expect(typeof journal.userProfileId).toBe("string");
      expect(typeof journal.title).toBe("string");
      expect(typeof journal.content).toBe("object");
      expect(typeof journal.public).toBe("boolean");
      expect(journal.createdAt).toBeInstanceOf(Date);
      expect(journal.lastModified).toBeInstanceOf(Date);
    });
  });
});
