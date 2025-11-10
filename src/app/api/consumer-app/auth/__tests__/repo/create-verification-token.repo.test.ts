import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestDatabase,
  cleanupTestDatabase,
  type TestDatabase,
} from "@/test/db-helper";
import { createAuthRepository } from "../../auth.repo";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { PGlite } from "@electric-sql/pglite";

describe("Auth Repository - createVerificationToken (PGlite)", () => {
  let db: TestDatabase;
  let client: PGlite;
  let repo: ReturnType<typeof createAuthRepository>;

  // Test data
  const testIdentifier = "test@example.com";
  const testTokenHash = "hashed_token_abc123";
  const testExpires = new Date("2025-11-10T15:00:00Z");

  beforeEach(async () => {
    // Create fresh in-memory database for each test
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;

    // Create repository with test database
    repo = createAuthRepository({ db });
  });

  afterEach(async () => {
    await cleanupTestDatabase(client);
  });

  it("successfully inserts verification token with all fields", async () => {
    // Given: Token data to insert
    const tokenData = {
      identifier: testIdentifier,
      token: testTokenHash,
      expires: testExpires,
    };

    // When
    const result = await repo.createVerificationToken(tokenData);

    // Then
    expect(result).not.toBeNull();
    expect(result.identifier).toBe(testIdentifier);
    expect(result.token).toBe(testTokenHash);
    expect(result.expires).toEqual(testExpires);

    // Verify in database
    const tokens = await db
      .select()
      .from(schema.verificationTokens)
      .where(eq(schema.verificationTokens.identifier, testIdentifier));

    expect(tokens).toHaveLength(1);
    expect(tokens[0].token).toBe(testTokenHash);
  });

  it("returns created token with identifier, token hash, and expires", async () => {
    // Given: Token data
    const tokenData = {
      identifier: testIdentifier,
      token: testTokenHash,
      expires: testExpires,
    };

    // When
    const result = await repo.createVerificationToken(tokenData);

    // Then
    expect(result).toMatchObject({
      identifier: testIdentifier,
      token: testTokenHash,
      expires: testExpires,
    });
  });

  it("allows multiple tokens for same identifier with different token values", async () => {
    // Given: First token for identifier
    await repo.createVerificationToken({
      identifier: testIdentifier,
      token: "hashed_token_1",
      expires: testExpires,
    });

    // When: Create second token for same identifier
    const result = await repo.createVerificationToken({
      identifier: testIdentifier,
      token: "hashed_token_2",
      expires: new Date("2025-11-10T16:00:00Z"),
    });

    // Then: Both tokens exist
    expect(result).not.toBeNull();
    expect(result.token).toBe("hashed_token_2");

    const tokens = await db
      .select()
      .from(schema.verificationTokens)
      .where(eq(schema.verificationTokens.identifier, testIdentifier));

    expect(tokens).toHaveLength(2);
  });

  it("stores expiration timestamp correctly", async () => {
    // Given: Token with specific expiration
    const futureExpires = new Date("2025-12-31T23:59:59Z");
    const tokenData = {
      identifier: testIdentifier,
      token: testTokenHash,
      expires: futureExpires,
    };

    // When
    const result = await repo.createVerificationToken(tokenData);

    // Then
    expect(result.expires).toEqual(futureExpires);

    // Verify expiration stored correctly in DB
    const [token] = await db
      .select()
      .from(schema.verificationTokens)
      .where(eq(schema.verificationTokens.token, testTokenHash));

    expect(token.expires).toEqual(futureExpires);
  });
});
