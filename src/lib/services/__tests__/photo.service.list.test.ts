import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDatabase, type TestDatabase } from "@/test/db-helper";
import { makePhotoService } from "../photo.service";
import * as schema from "@/lib/db/schema";
import type { PGlite } from "@electric-sql/pglite";
import {
  createMockStorageService,
  TEST_USER_ID,
  OTHER_USER_ID,
  type MockStorageService,
} from "./helpers/photo-test-helper";

describe("PhotoService - List Photos", () => {
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

  it("returns empty array when user has no photos", async () => {
    // When
    const result = await service.listPhotos({
      userProfileId: TEST_USER_ID,
      limit: 20,
      offset: 0,
    });

    // Then
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it("returns photos ordered by uploadedAt DESC", async () => {
    // Given - create 3 photos with different upload times
    await service.createPhoto({
      userProfileId: TEST_USER_ID,
      s3Key: "photo1.jpg",
      s3Bucket: "test-bucket",
      bytes: 1000000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/photo1.jpg",
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    await service.createPhoto({
      userProfileId: TEST_USER_ID,
      s3Key: "photo2.jpg",
      s3Bucket: "test-bucket",
      bytes: 2000000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/photo2.jpg",
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    await service.createPhoto({
      userProfileId: TEST_USER_ID,
      s3Key: "photo3.jpg",
      s3Bucket: "test-bucket",
      bytes: 3000000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/photo3.jpg",
    });

    // When
    const result = await service.listPhotos({
      userProfileId: TEST_USER_ID,
      limit: 20,
      offset: 0,
    });

    // Then - should return in DESC order (newest first)
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(3);
      expect(result.data[0].s3Key).toBe("photo3.jpg");
      expect(result.data[1].s3Key).toBe("photo2.jpg");
      expect(result.data[2].s3Key).toBe("photo1.jpg");
    }
  });

  it("paginates results correctly", async () => {
    // Given - create 5 photos
    for (let i = 1; i <= 5; i++) {
      await service.createPhoto({
        userProfileId: TEST_USER_ID,
        s3Key: `photo${i}.jpg`,
        s3Bucket: "test-bucket",
        bytes: 1000000 * i,
        mime: "image/jpeg",
        imageUrl: `https://s3.amazonaws.com/photo${i}.jpg`,
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // When - get page 1 (limit 2, offset 0)
    const page1 = await service.listPhotos({
      userProfileId: TEST_USER_ID,
      limit: 2,
      offset: 0,
    });

    // Then
    expect(page1.success).toBe(true);
    if (page1.success) {
      expect(page1.data).toHaveLength(2);
    }

    // When - get page 2 (limit 2, offset 2)
    const page2 = await service.listPhotos({
      userProfileId: TEST_USER_ID,
      limit: 2,
      offset: 2,
    });

    // Then
    expect(page2.success).toBe(true);
    if (page2.success) {
      expect(page2.data).toHaveLength(2);
    }

    // When - get page 3 (limit 2, offset 4)
    const page3 = await service.listPhotos({
      userProfileId: TEST_USER_ID,
      limit: 2,
      offset: 4,
    });

    // Then - last page has 1 item
    expect(page3.success).toBe(true);
    if (page3.success) {
      expect(page3.data).toHaveLength(1);
    }
  });

  it("filters by weekNumber", async () => {
    // Given - create photos with different week numbers
    await service.createPhoto({
      userProfileId: TEST_USER_ID,
      s3Key: "photo1.jpg",
      s3Bucket: "test-bucket",
      bytes: 1000000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/photo1.jpg",
      weekNumber: 1,
    });

    await service.createPhoto({
      userProfileId: TEST_USER_ID,
      s3Key: "photo2.jpg",
      s3Bucket: "test-bucket",
      bytes: 2000000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/photo2.jpg",
      weekNumber: 2,
    });

    await service.createPhoto({
      userProfileId: TEST_USER_ID,
      s3Key: "photo3.jpg",
      s3Bucket: "test-bucket",
      bytes: 3000000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/photo3.jpg",
      weekNumber: 1,
    });

    // When - filter by weekNumber 1
    const result = await service.listPhotos({
      userProfileId: TEST_USER_ID,
      limit: 20,
      offset: 0,
      weekNumber: 1,
    });

    // Then - only week 1 photos
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data.every((p) => p.weekNumber === 1)).toBe(true);
    }
  });

  it("only returns photos for specified user", async () => {
    // Given - create photos for different users
    await service.createPhoto({
      userProfileId: TEST_USER_ID,
      s3Key: "user1-photo.jpg",
      s3Bucket: "test-bucket",
      bytes: 1000000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/user1-photo.jpg",
    });

    await service.createPhoto({
      userProfileId: OTHER_USER_ID,
      s3Key: "user2-photo.jpg",
      s3Bucket: "test-bucket",
      bytes: 2000000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/user2-photo.jpg",
    });

    // When - list photos for TEST_USER_ID
    const result = await service.listPhotos({
      userProfileId: TEST_USER_ID,
      limit: 20,
      offset: 0,
    });

    // Then - only TEST_USER_ID's photos
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].userProfileId).toBe(TEST_USER_ID);
    }
  });
});
