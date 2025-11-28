import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestDatabase,
  cleanupTestDatabase,
  type TestDatabase,
} from "@/test/db-helper";
import { makeProfileRepo } from "./profile.repo";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { PGlite } from "@electric-sql/pglite";

describe("ProfileRepo - Integration Tests", () => {
  let db: TestDatabase;
  let client: PGlite;
  let repo: ReturnType<typeof makeProfileRepo>;

  // Test IDs
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const profileId = "650e8400-e29b-41d4-a716-446655440000";

  beforeEach(async () => {
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;
    repo = makeProfileRepo({ db });

    // Seed auth user
    await db.insert(schema.users).values({
      id: userId,
      email: "test@example.com",
      name: "Test User",
    });

    // Seed user profile
    await db.insert(schema.userProfiles).values({
      id: profileId,
      userId,
      firstName: "John",
      lastName: "Doe",
      email: "test@example.com",
      phoneNumber: "+1234567890",
      dateOfBirth: new Date("1990-01-01"),
      nickname: null,
    });
  });

  afterEach(async () => {
    await cleanupTestDatabase(client);
  });

  describe("updateProfile", () => {
    it("updates nickname field", async () => {
      const result = await repo.updateProfile(userId, { nickname: "skinny" });

      expect(result).not.toBeNull();
      expect(result!.nickname).toBe("skinny");
      expect(result!.firstName).toBe("John");
      expect(result!.lastName).toBe("Doe");
    });

    it("updates multiple fields", async () => {
      const result = await repo.updateProfile(userId, {
        nickname: "skinny",
        firstName: "Jane",
        lastName: "Smith",
      });

      expect(result).not.toBeNull();
      expect(result!.nickname).toBe("skinny");
      expect(result!.firstName).toBe("Jane");
      expect(result!.lastName).toBe("Smith");
    });

    it("updates updatedAt timestamp", async () => {
      const beforeUpdate = new Date();

      const result = await repo.updateProfile(userId, { nickname: "skinny" });

      expect(result).not.toBeNull();
      expect(result!.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime(),
      );
    });

    it("returns null when user does not exist", async () => {
      const nonExistentUserId = "550e8400-e29b-41d4-a716-446655440099";

      const result = await repo.updateProfile(nonExistentUserId, {
        nickname: "skinny",
      });

      expect(result).toBeNull();
    });

    it("updates productsReceived field", async () => {
      const result = await repo.updateProfile(userId, {
        productsReceived: true,
      });

      expect(result).not.toBeNull();
      expect(result!.firstName).toBe("John");
      expect(result!.productsReceived).toBe(true);

      // Verify in database
      const dbRecord = await db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, userId))
        .limit(1);

      expect(dbRecord[0].productsReceived).toBe(true);
    });

    it("updates routineStartDateSet field", async () => {
      const result = await repo.updateProfile(userId, {
        routineStartDateSet: true,
      });

      expect(result).not.toBeNull();
      expect(result!.firstName).toBe("John");
      expect(result!.routineStartDateSet).toBe(true);

      // Verify in database
      const dbRecord = await db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, userId))
        .limit(1);

      expect(dbRecord[0].routineStartDateSet).toBe(true);
    });

    it("updates both productsReceived and routineStartDateSet together", async () => {
      const result = await repo.updateProfile(userId, {
        productsReceived: true,
        routineStartDateSet: true,
      });

      expect(result).not.toBeNull();
      expect(result!.firstName).toBe("John");
      expect(result!.productsReceived).toBe(true);
      expect(result!.routineStartDateSet).toBe(true);

      // Verify both fields in database
      const dbRecord = await db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, userId))
        .limit(1);

      expect(dbRecord[0].productsReceived).toBe(true);
      expect(dbRecord[0].routineStartDateSet).toBe(true);
    });
  });
});
