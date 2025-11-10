import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestDatabase,
  cleanupTestDatabase,
  type TestDatabase,
} from "@/test/db-helper";
import { createAuthRepository } from "../../auth.repo";
import * as schema from "@/lib/db/schema";
import type { PGlite } from "@electric-sql/pglite";

describe("Auth Repository - getUserByEmail (PGlite)", () => {
  let db: TestDatabase;
  let client: PGlite;
  let repo: ReturnType<typeof createAuthRepository>;

  // Test data
  const testUserEmail = "test@example.com";
  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testProfileId = "660e8400-e29b-41d4-a716-446655440001";

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

  it("returns user with onboardingComplete true when isCompleted is true and hasCompletedBooking is true", async () => {
    // Given: User with complete profile exists
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
    const result = await repo.getUserByEmail(testUserEmail);

    // Then
    expect(result).not.toBeNull();
    expect(result?.user.id).toBe(testUserId);
    expect(result?.user.email).toBe(testUserEmail);
    expect(result?.profile).not.toBeNull();
    expect(result?.profile?.onboardingComplete).toBe(true);
  });

  it("returns user with onboardingComplete false when isCompleted is true but hasCompletedBooking is false", async () => {
    // Given: User with incomplete booking
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
    const result = await repo.getUserByEmail(testUserEmail);

    // Then
    expect(result).not.toBeNull();
    expect(result?.profile?.onboardingComplete).toBe(false);
  });

  it("returns user with onboardingComplete false when isCompleted is false but hasCompletedBooking is true", async () => {
    // Given: User with incomplete onboarding
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
      isCompleted: false,
      hasCompletedBooking: true,
    });

    // When
    const result = await repo.getUserByEmail(testUserEmail);

    // Then
    expect(result).not.toBeNull();
    expect(result?.profile?.onboardingComplete).toBe(false);
  });

  it("returns user with onboardingComplete false when both isCompleted and hasCompletedBooking are false", async () => {
    // Given: User with both incomplete
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
      isCompleted: false,
      hasCompletedBooking: false,
    });

    // When
    const result = await repo.getUserByEmail(testUserEmail);

    // Then
    expect(result).not.toBeNull();
    expect(result?.profile?.onboardingComplete).toBe(false);
  });

  it("returns null when email doesn't exist", async () => {
    // Given: Email not in database
    // When
    const result = await repo.getUserByEmail("nonexistent@example.com");

    // Then
    expect(result).toBeNull();
  });

  it("finds user by email case-insensitively", async () => {
    // Given: User exists with lowercase email
    await db.insert(schema.users).values({
      id: testUserId,
      email: testUserEmail.toLowerCase(),
      emailVerified: new Date("2025-01-01"),
      name: "Test User",
      image: null,
    });

    await db.insert(schema.userProfiles).values({
      id: testProfileId,
      userId: testUserId,
      email: testUserEmail.toLowerCase(),
      firstName: "Test",
      lastName: "User",
      phoneNumber: "+1234567890",
      dateOfBirth: new Date("1990-01-01"),
      isCompleted: true,
      hasCompletedBooking: true,
    });

    // When: Search with uppercase
    const result = await repo.getUserByEmail(testUserEmail.toUpperCase());

    // Then
    expect(result).not.toBeNull();
    expect(result?.user.email).toBe(testUserEmail.toLowerCase());
  });

  it("returns user with null profile when user exists but has no userProfiles record", async () => {
    // Given: User exists but no profile
    await db.insert(schema.users).values({
      id: testUserId,
      email: testUserEmail,
      emailVerified: new Date("2025-01-01"),
      name: "Test User",
      image: null,
    });

    // When
    const result = await repo.getUserByEmail(testUserEmail);

    // Then
    expect(result).not.toBeNull();
    expect(result?.user.id).toBe(testUserId);
    expect(result?.profile).toBeNull();
  });
});
