import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createAuthRepository } from "../../auth.repo";
import * as schema from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

describe("Auth Repository - Verification Code (PGlite)", () => {
  let client: PGlite;
  let db: ReturnType<typeof drizzle>;
  let repo: ReturnType<typeof createAuthRepository>;

  const testIdentifier = "test@example.com";
  const testCode = "123456";
  const testExpires = new Date("2025-11-10T14:15:00Z");

  beforeEach(async () => {
    // Create a fresh in-memory PGlite instance for each test
    client = new PGlite();
    db = drizzle(client, { schema });

    // Run migrations
    await migrate(db, {
      migrationsFolder: "./src/lib/db/migrations",
    });

    // Create repository instance
    repo = createAuthRepository({
      db: db as unknown as NonNullable<
        Parameters<typeof createAuthRepository>[0]
      >["db"],
    });
  });

  it("successfully creates verification code with hashed value", async () => {
    // Given: Valid identifier and 6-digit code
    const hashedCode = "hashed_123456";

    // When
    const result = await repo.createVerificationCode({
      identifier: testIdentifier,
      code: hashedCode,
      expires: testExpires,
    });

    // Then
    expect(result.identifier).toBe(testIdentifier);
    expect(result.code).toBe(hashedCode);
    expect(result.expires).toEqual(testExpires);

    // Verify code is stored in database
    const codes = await db
      .select()
      .from(schema.verificationTokens)
      .where(eq(schema.verificationTokens.identifier, testIdentifier));

    expect(codes).toHaveLength(1);
    expect(codes[0].token).toBe(hashedCode);
  });

  it("stores code with correct expiration (15 minutes)", async () => {
    // Given: Valid identifier and code with expiration
    const hashedCode = "hashed_123456";

    // When
    await repo.createVerificationCode({
      identifier: testIdentifier,
      code: hashedCode,
      expires: testExpires,
    });

    // Then: Verify expiration stored correctly
    const codes = await db
      .select()
      .from(schema.verificationTokens)
      .where(eq(schema.verificationTokens.identifier, testIdentifier));

    expect(codes[0].expires).toEqual(testExpires);
  });

  it("allows multiple codes for same identifier", async () => {
    // Given: Same identifier with different codes
    const hashedCode1 = "hashed_123456";
    const hashedCode2 = "hashed_654321";

    // When
    await repo.createVerificationCode({
      identifier: testIdentifier,
      code: hashedCode1,
      expires: testExpires,
    });

    await repo.createVerificationCode({
      identifier: testIdentifier,
      code: hashedCode2,
      expires: testExpires,
    });

    // Then: Both codes stored
    const codes = await db
      .select()
      .from(schema.verificationTokens)
      .where(eq(schema.verificationTokens.identifier, testIdentifier));

    expect(codes).toHaveLength(2);
  });

  it("successfully finds and deletes verification code (one-time use)", async () => {
    // Given: Code exists in database
    await db.insert(schema.verificationTokens).values({
      identifier: testIdentifier,
      token: testCode,
      expires: testExpires,
    });

    // When
    const result = await repo.useVerificationCode(testIdentifier, testCode);

    // Then: Code is returned
    expect(result).not.toBeNull();
    expect(result?.identifier).toBe(testIdentifier);
    expect(result?.code).toBe(testCode);

    // Verify code is deleted from database (consumed)
    const codes = await db
      .select()
      .from(schema.verificationTokens)
      .where(
        and(
          eq(schema.verificationTokens.identifier, testIdentifier),
          eq(schema.verificationTokens.token, testCode),
        ),
      );

    expect(codes).toHaveLength(0);
  });

  it("returns null when code doesn't exist", async () => {
    // Given: Non-existent code
    const nonExistentCode = "999999";

    // When
    const result = await repo.useVerificationCode(
      testIdentifier,
      nonExistentCode,
    );

    // Then
    expect(result).toBeNull();
  });

  it("returns null when identifier doesn't match", async () => {
    // Given: Code exists but different identifier
    await db.insert(schema.verificationTokens).values({
      identifier: testIdentifier,
      token: testCode,
      expires: testExpires,
    });

    // When
    const result = await repo.useVerificationCode(
      "different@example.com",
      testCode,
    );

    // Then
    expect(result).toBeNull();
  });

  it("deletes code only when both identifier and code match", async () => {
    // Given: Multiple codes for different identifiers
    const identifier1 = "user1@example.com";
    const identifier2 = "user2@example.com";
    const code1 = "111111";
    const code2 = "222222";

    await db.insert(schema.verificationTokens).values([
      {
        identifier: identifier1,
        token: code1,
        expires: testExpires,
      },
      {
        identifier: identifier2,
        token: code2,
        expires: testExpires,
      },
    ]);

    // When: Delete specific identifier/code pair
    await repo.useVerificationCode(identifier1, code1);

    // Then: Only matching code is deleted
    const remainingCodes = await db.select().from(schema.verificationTokens);

    expect(remainingCodes).toHaveLength(1);
    expect(remainingCodes[0].identifier).toBe(identifier2);
    expect(remainingCodes[0].token).toBe(code2);
  });
});
