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

describe("PhotoService - Get Photo by ID", () => {
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

  it("returns photo when it exists and user owns it", async () => {
    // Given - create a photo
    const createResult = await service.createPhoto({
      userProfileId: TEST_USER_ID,
      s3Key: "photos/users/abc/2025-11-03/def.jpg",
      s3Bucket: "test-bucket",
      bytes: 2500000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/test-bucket/photo.jpg",
    });

    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    const photoId = createResult.data.id;

    // When
    const result = await service.getPhotoById(photoId, TEST_USER_ID);

    // Then
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(photoId);
      expect(result.data.userProfileId).toBe(TEST_USER_ID);
    }
  });

  it("returns error when photo does not exist", async () => {
    // When
    const result = await service.getPhotoById(NON_EXISTENT_ID, TEST_USER_ID);

    // Then
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not found");
    }
  });

  it("returns error when user does not own photo", async () => {
    // Given - create a photo owned by TEST_USER_ID
    const createResult = await service.createPhoto({
      userProfileId: TEST_USER_ID,
      s3Key: "photos/users/abc/2025-11-03/def.jpg",
      s3Bucket: "test-bucket",
      bytes: 2500000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/test-bucket/photo.jpg",
    });

    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    const photoId = createResult.data.id;

    // When - try to access with different user
    const result = await service.getPhotoById(photoId, OTHER_USER_ID);

    // Then
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not found");
    }
  });
});
