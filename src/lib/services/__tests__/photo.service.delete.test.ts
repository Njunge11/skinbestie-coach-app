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

describe("PhotoService - Delete Photo", () => {
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

  it("deletes photo from DB and S3", async () => {
    // Given - create a photo with S3 key
    const createResult = await service.createPhoto({
      userProfileId: TEST_USER_ID,
      s3Key: "photos/users/abc/photo.jpg",
      s3Bucket: "test-bucket",
      bytes: 1000000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/photo.jpg",
    });

    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    const photoId = createResult.data.id;

    // When - delete the photo
    const result = await service.deletePhoto(photoId, TEST_USER_ID);

    // Then - photo is deleted from DB
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(photoId);
    }

    // Verify photo no longer exists in DB
    const getResult = await service.getPhotoById(photoId, TEST_USER_ID);
    expect(getResult.success).toBe(false);

    // Verify S3 delete was called
    expect(mockStorageService.deletePhoto).toHaveBeenCalledWith(
      "photos/users/abc/photo.jpg",
    );
  });

  it("deletes photo even if S3 deletion fails", async () => {
    // Given - create a photo
    const createResult = await service.createPhoto({
      userProfileId: TEST_USER_ID,
      s3Key: "photos/users/abc/photo.jpg",
      s3Bucket: "test-bucket",
      bytes: 1000000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/photo.jpg",
    });

    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    const photoId = createResult.data.id;

    // Mock S3 deletion to fail
    mockStorageService.deletePhoto.mockRejectedValue(
      new Error("S3 deletion failed"),
    );

    // When - delete the photo
    const result = await service.deletePhoto(photoId, TEST_USER_ID);

    // Then - photo is still deleted from DB (S3 failure is ignored)
    expect(result.success).toBe(true);

    // Verify photo no longer exists in DB
    const getResult = await service.getPhotoById(photoId, TEST_USER_ID);
    expect(getResult.success).toBe(false);
  });

  it("returns error when photo not found", async () => {
    // When
    const result = await service.deletePhoto(NON_EXISTENT_ID, TEST_USER_ID);

    // Then
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not found");
    }
  });

  it("prevents deleting another user's photo", async () => {
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

    // When - try to delete with different user
    const result = await service.deletePhoto(photoId, OTHER_USER_ID);

    // Then
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not found");
    }

    // Verify photo still exists
    const getResult = await service.getPhotoById(photoId, TEST_USER_ID);
    expect(getResult.success).toBe(true);
  });
});
