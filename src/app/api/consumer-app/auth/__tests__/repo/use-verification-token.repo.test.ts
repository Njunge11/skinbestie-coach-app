import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestDatabase,
  cleanupTestDatabase,
  type TestDatabase,
} from "@/test/db-helper";
import { createAuthRepository } from "../../auth.repo";
import * as schema from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { PGlite } from "@electric-sql/pglite";

describe("Auth Repository - useVerificationToken (PGlite)", () => {
  let db: TestDatabase;
  let client: PGlite;
  let repo: ReturnType<typeof createAuthRepository>;

  // Test data
  const testIdentifier = "test@example.com";
  const testToken = "hashed_token_abc123";
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

  it("successfully finds verification token by identifier and token hash", async () => {
    // Given: Token exists in database
    await db.insert(schema.verificationTokens).values({
      identifier: testIdentifier,
      token: testToken,
      expires: testExpires,
    });

    // When
    const result = await repo.useVerificationToken(testIdentifier, testToken);

    // Then
    expect(result).not.toBeNull();
    expect(result?.identifier).toBe(testIdentifier);
    expect(result?.token).toBe(testToken);
    expect(result?.expires).toEqual(testExpires);
  });

  it("marks token as used and deletes it from database", async () => {
    // Given: Token exists in database
    await db.insert(schema.verificationTokens).values({
      identifier: testIdentifier,
      token: testToken,
      expires: testExpires,
    });

    // When
    const result = await repo.useVerificationToken(testIdentifier, testToken);

    // Then: Token is returned
    expect(result).not.toBeNull();

    // Verify token is deleted from database (consumed)
    const tokens = await db
      .select()
      .from(schema.verificationTokens)
      .where(
        and(
          eq(schema.verificationTokens.identifier, testIdentifier),
          eq(schema.verificationTokens.token, testToken),
        ),
      );

    expect(tokens).toHaveLength(0);
  });

  it("returns null when token doesn't exist", async () => {
    // Given: No token in database
    // When
    const result = await repo.useVerificationToken(
      testIdentifier,
      "nonexistent_token",
    );

    // Then
    expect(result).toBeNull();
  });

  it("returns null when identifier doesn't match", async () => {
    // Given: Token exists for different identifier
    await db.insert(schema.verificationTokens).values({
      identifier: testIdentifier,
      token: testToken,
      expires: testExpires,
    });

    // When: Try to use with wrong identifier
    const result = await repo.useVerificationToken(
      "wrong@example.com",
      testToken,
    );

    // Then
    expect(result).toBeNull();

    // Original token should still exist
    const tokens = await db
      .select()
      .from(schema.verificationTokens)
      .where(eq(schema.verificationTokens.token, testToken));

    expect(tokens).toHaveLength(1);
  });

  it("deletes token only when both identifier and token match", async () => {
    // Given: Multiple tokens exist
    await db.insert(schema.verificationTokens).values([
      {
        identifier: testIdentifier,
        token: "token_1",
        expires: testExpires,
      },
      {
        identifier: testIdentifier,
        token: "token_2",
        expires: testExpires,
      },
      {
        identifier: "other@example.com",
        token: "token_3",
        expires: testExpires,
      },
    ]);

    // When: Use specific token
    const result = await repo.useVerificationToken(testIdentifier, "token_1");

    // Then: Only that token is deleted
    expect(result).not.toBeNull();
    expect(result?.token).toBe("token_1");

    const remainingTokens = await db.select().from(schema.verificationTokens);

    expect(remainingTokens).toHaveLength(2);
    expect(remainingTokens.find((t) => t.token === "token_1")).toBeUndefined();
  });
});
