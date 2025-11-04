// Shared test setup for repo tests
import { beforeEach, afterEach } from "vitest";
import {
  createTestDatabase,
  cleanupTestDatabase,
  type TestDatabase,
} from "@/test/db-helper";
import { makeStatsRepo } from "../../stats.repo";
import * as schema from "@/lib/db/schema";
import type { PGlite } from "@electric-sql/pglite";

export let db: TestDatabase;
export let client: PGlite;
export let repo: ReturnType<typeof makeStatsRepo>;

// Test UUIDs
export const authUserId = "350e8400-e29b-41d4-a716-446655440099";
export const authUserId2 = "350e8400-e29b-41d4-a716-446655440098";
export const profileId = "550e8400-e29b-41d4-a716-446655440000";
export const profileId2 = "550e8400-e29b-41d4-a716-446655440001";
export const routineId = "650e8400-e29b-41d4-a716-446655440000";
export const productId1 = "750e8400-e29b-41d4-a716-446655440001";
export const productId2 = "750e8400-e29b-41d4-a716-446655440002";
export const productId3 = "750e8400-e29b-41d4-a716-446655440003";
export const productId4 = "750e8400-e29b-41d4-a716-446655440004";
export const productId5 = "750e8400-e29b-41d4-a716-446655440005";

export function setupRepoTests() {
  beforeEach(async () => {
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;
    repo = makeStatsRepo({ db });

    await db.insert(schema.users).values({
      id: authUserId,
      email: "auth@test.com",
      name: "Auth User",
    });

    await db.insert(schema.users).values({
      id: authUserId2,
      email: "auth2@test.com",
      name: "Auth User 2",
    });
  });

  afterEach(async () => {
    await cleanupTestDatabase(client);
  });
}
