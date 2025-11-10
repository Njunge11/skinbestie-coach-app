import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createAuthRepository } from "../../auth.repo";
import * as schema from "@/lib/db/schema";

describe("Auth Repository - getUserById (PGlite)", () => {
  let client: PGlite;
  let db: ReturnType<typeof drizzle>;
  let repo: ReturnType<typeof createAuthRepository>;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testUserEmail = "test@example.com";
  const testProfileId = "660e8400-e29b-41d4-a716-446655440001";

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

  it("successfully retrieves user with profile by ID", async () => {
    // Given: User and profile exist in database
    await db.insert(schema.users).values({
      id: testUserId,
      email: testUserEmail,
      emailVerified: new Date("2025-01-01"),
      name: "Test User",
      image: null,
    });

    await db.insert(schema.userProfiles).values({
      id: testProfileId,
      userId: testUserId,
      email: testUserEmail,
      firstName: "Test",
      lastName: "User",
      phoneNumber: "+1234567890",
      dateOfBirth: new Date("1990-01-01"),
      isCompleted: true,
      hasCompletedBooking: true,
    });

    // When
    const result = await repo.getUserById(testUserId);

    // Then
    expect(result).not.toBeNull();
    expect(result?.user.id).toBe(testUserId);
    expect(result?.user.email).toBe(testUserEmail);
    expect(result?.profile).not.toBeNull();
    expect(result?.profile?.id).toBe(testProfileId);
    expect(result?.profile?.onboardingComplete).toBe(true);
  });

  it("returns user with onboardingComplete true when both flags are true", async () => {
    // Given: User with isCompleted=true and hasCompletedBooking=true
    await db.insert(schema.users).values({
      id: testUserId,
      email: testUserEmail,
      emailVerified: new Date("2025-01-01"),
      name: "Test User",
      image: null,
    });

    await db.insert(schema.userProfiles).values({
      id: testProfileId,
      userId: testUserId,
      email: testUserEmail,
      firstName: "Test",
      lastName: "User",
      phoneNumber: "+1234567890",
      dateOfBirth: new Date("1990-01-01"),
      isCompleted: true,
      hasCompletedBooking: true,
    });

    // When
    const result = await repo.getUserById(testUserId);

    // Then
    expect(result?.profile?.onboardingComplete).toBe(true);
  });

  it("returns user with onboardingComplete false when either flag is false", async () => {
    // Given: User with isCompleted=true but hasCompletedBooking=false
    await db.insert(schema.users).values({
      id: testUserId,
      email: testUserEmail,
      emailVerified: new Date("2025-01-01"),
      name: "Test User",
      image: null,
    });

    await db.insert(schema.userProfiles).values({
      id: testProfileId,
      userId: testUserId,
      email: testUserEmail,
      firstName: "Test",
      lastName: "User",
      phoneNumber: "+1234567890",
      dateOfBirth: new Date("1990-01-01"),
      isCompleted: true,
      hasCompletedBooking: false,
    });

    // When
    const result = await repo.getUserById(testUserId);

    // Then
    expect(result?.profile?.onboardingComplete).toBe(false);
  });

  it("returns null when user ID doesn't exist", async () => {
    // Given: Invalid/non-existent user ID
    const nonExistentId = "999e8400-e29b-41d4-a716-446655440999";

    // When
    const result = await repo.getUserById(nonExistentId);

    // Then
    expect(result).toBeNull();
  });

  it("returns user with null profile when user exists but has no profile", async () => {
    // Given: User exists but no userProfiles record
    await db.insert(schema.users).values({
      id: testUserId,
      email: testUserEmail,
      emailVerified: new Date("2025-01-01"),
      name: "Test User",
      image: null,
    });

    // When
    const result = await repo.getUserById(testUserId);

    // Then
    expect(result).not.toBeNull();
    expect(result?.user.id).toBe(testUserId);
    expect(result?.profile).toBeNull();
  });
});
