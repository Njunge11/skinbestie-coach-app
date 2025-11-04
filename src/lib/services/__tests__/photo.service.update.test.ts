import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDatabase, type TestDatabase } from "@/test/db-helper";
import { makePhotoService } from "../photo.service";
import * as schema from "@/lib/db/schema";
import type { PGlite } from "@electric-sql/pglite";
import {
  createMockStorageService,
  TEST_USER_ID,
  OTHER_USER_ID,
  NON_EXISTENT_ID,
  type MockStorageService,
} from "./helpers/photo-test-helper";

describe("PhotoService - Update Photo", () => {
  let db: TestDatabase;
  let client: PGlite;
  let service: ReturnType<typeof makePhotoService>;
  let mockStorageService: MockStorageService;

  beforeEach(async () => {
    // Create test database
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;

    // Mock storage service
    mockStorageService = createMockStorageService();

    // Create service with test dependencies
    service = makePhotoService({
      db,
      storageService: mockStorageService,
    });

    // Seed test users
    await db.insert(schema.userProfiles).values([
      {
        id: TEST_USER_ID,
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
      },
      {
        id: OTHER_USER_ID,
        email: "other@example.com",
        firstName: "Other",
        lastName: "User",
        phoneNumber: "+9876543210",
        dateOfBirth: new Date("1990-01-01"),
      },
    ]);
  });

  afterEach(async () => {
    await client.close();
  });

  it("updates photo status", async () => {
    // Given - create a photo
    const createResult = await service.createPhoto({
      userProfileId: TEST_USER_ID,
      s3Key: "photo.jpg",
      s3Bucket: "test-bucket",
      bytes: 1000000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/photo.jpg",
    });

    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    const photoId = createResult.data.id;

    // When - update status
    const result = await service.updatePhoto(photoId, TEST_USER_ID, {
      status: "reviewed",
    });

    // Then
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("reviewed");
    }
  });

  it("updates photo feedback", async () => {
    // Given - create a photo
    const createResult = await service.createPhoto({
      userProfileId: TEST_USER_ID,
      s3Key: "photo.jpg",
      s3Bucket: "test-bucket",
      bytes: 1000000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/photo.jpg",
    });

    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    const photoId = createResult.data.id;

    // When - add feedback
    const result = await service.updatePhoto(photoId, TEST_USER_ID, {
      feedback: "Great progress!",
    });

    // Then
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.feedback).toBe("Great progress!");
    }
  });

  it("updates photo weekNumber", async () => {
    // Given - create a photo
    const createResult = await service.createPhoto({
      userProfileId: TEST_USER_ID,
      s3Key: "photo.jpg",
      s3Bucket: "test-bucket",
      bytes: 1000000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/photo.jpg",
    });

    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    const photoId = createResult.data.id;

    // When - update weekNumber
    const result = await service.updatePhoto(photoId, TEST_USER_ID, {
      weekNumber: 5,
    });

    // Then
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.weekNumber).toBe(5);
    }
  });

  it("returns error when photo not found", async () => {
    // When
    const result = await service.updatePhoto(NON_EXISTENT_ID, TEST_USER_ID, {
      status: "reviewed",
    });

    // Then
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not found");
    }
  });

  it("prevents updating another user's photo", async () => {
    // Given - create a photo owned by TEST_USER_ID
    const createResult = await service.createPhoto({
      userProfileId: TEST_USER_ID,
      s3Key: "photo.jpg",
      s3Bucket: "test-bucket",
      bytes: 1000000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/photo.jpg",
    });

    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    const photoId = createResult.data.id;

    // When - try to update with different user
    const result = await service.updatePhoto(photoId, OTHER_USER_ID, {
      status: "reviewed",
    });

    // Then
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not found");
    }
  });
});
