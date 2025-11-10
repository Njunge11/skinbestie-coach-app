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

describe("Journals Repository - Delete Tests (PGlite)", () => {
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

  describe("deleteJournal", () => {
    it("should delete journal and return true", async () => {
      // Create a journal first
      const journal = await repo.createJournal({
        userProfileId: testUserId,
        title: "To be deleted",
      });

      // Delete it
      const result = await repo.deleteJournal(journal.id);

      expect(result).toBe(true);
    });

    it("should return false when journal ID doesn't exist", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";

      const result = await repo.deleteJournal(fakeId);

      expect(result).toBe(false);
    });

    it("should verify journal no longer exists after delete", async () => {
      // Create a journal
      const journal = await repo.createJournal({
        userProfileId: testUserId,
        title: "To be deleted",
      });

      // Delete it
      await repo.deleteJournal(journal.id);

      // Try to find it - should return null
      const found = await repo.findJournalById(journal.id);

      expect(found).toBeNull();
    });

    it("should return false when attempting to delete already deleted journal", async () => {
      // Create a journal
      const journal = await repo.createJournal({
        userProfileId: testUserId,
        title: "To be deleted",
      });

      // Delete it once
      const firstDelete = await repo.deleteJournal(journal.id);
      expect(firstDelete).toBe(true);

      // Try to delete again
      const secondDelete = await repo.deleteJournal(journal.id);
      expect(secondDelete).toBe(false);
    });

    it("should not affect other journals when deleting one", async () => {
      // Create two journals
      const journal1 = await repo.createJournal({
        userProfileId: testUserId,
        title: "Journal 1",
      });

      const journal2 = await repo.createJournal({
        userProfileId: testUserId,
        title: "Journal 2",
      });

      // Delete journal1
      await repo.deleteJournal(journal1.id);

      // Journal2 should still exist
      const found = await repo.findJournalById(journal2.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(journal2.id);
      expect(found?.title).toBe("Journal 2");
    });

    it("should actually remove record from database", async () => {
      // Create a journal
      const journal = await repo.createJournal({
        userProfileId: testUserId,
        title: "To be deleted",
      });

      // Delete it
      await repo.deleteJournal(journal.id);

      // Query database directly
      const [dbJournal] = await db
        .select()
        .from(schema.journals)
        .where(eq(schema.journals.id, journal.id));

      expect(dbJournal).toBeUndefined();
    });

    it("should return false for invalid UUID format", async () => {
      const invalidId = "not-a-valid-uuid";

      const result = await repo.deleteJournal(invalidId);

      expect(result).toBe(false);
    });
  });
});
