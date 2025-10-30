import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestDatabase,
  cleanupTestDatabase,
  type TestDatabase,
} from "@/test/db-helper";
import { makeGoalsTemplateRepo } from "./goals-template.repo";
import * as schema from "@/lib/db/schema";
import type { PGlite } from "@electric-sql/pglite";

describe("GoalsTemplateRepo - Integration Tests", () => {
  let db: TestDatabase;
  let client: PGlite;
  let repo: ReturnType<typeof makeGoalsTemplateRepo>;

  // Test IDs
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const profileId = "650e8400-e29b-41d4-a716-446655440000";
  const adminId = "850e8400-e29b-41d4-a716-446655440000";
  const templateId = "750e8400-e29b-41d4-a716-446655440000";

  beforeEach(async () => {
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;
    repo = makeGoalsTemplateRepo({ db });

    // Seed admin
    await db.insert(schema.admins).values({
      id: adminId,
      email: "admin@example.com",
      role: "admin",
    });

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
    });

    // Seed goals template
    await db.insert(schema.skinGoalsTemplate).values({
      id: templateId,
      userId: profileId,
      status: "published",
      goalsAcknowledgedByClient: false,
      createdBy: adminId,
      updatedBy: adminId,
    });
  });

  afterEach(async () => {
    await cleanupTestDatabase(client);
  });

  describe("updateGoalsTemplate", () => {
    it("updates goalsAcknowledgedByClient", async () => {
      const result = await repo.updateGoalsTemplate(profileId, {
        goalsAcknowledgedByClient: true,
      });

      expect(result).not.toBeNull();
      expect(result!.goalsAcknowledgedByClient).toBe(true);
      expect(result!.status).toBe("published");
    });

    it("updates status", async () => {
      const result = await repo.updateGoalsTemplate(profileId, {
        status: "unpublished",
      });

      expect(result).not.toBeNull();
      expect(result!.status).toBe("unpublished");
      expect(result!.goalsAcknowledgedByClient).toBe(false);
    });

    it("updates updatedAt timestamp", async () => {
      const beforeUpdate = new Date();

      const result = await repo.updateGoalsTemplate(profileId, {
        goalsAcknowledgedByClient: true,
      });

      expect(result).not.toBeNull();
      expect(result!.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime(),
      );
    });

    it("returns null when template does not exist", async () => {
      const nonExistentProfileId = "650e8400-e29b-41d4-a716-446655440099";

      const result = await repo.updateGoalsTemplate(nonExistentProfileId, {
        goalsAcknowledgedByClient: true,
      });

      expect(result).toBeNull();
    });
  });
});
