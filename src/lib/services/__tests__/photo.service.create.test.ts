import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDatabase, type TestDatabase } from "@/test/db-helper";
import { makePhotoService } from "../photo.service";
import * as schema from "@/lib/db/schema";
import type { PGlite } from "@electric-sql/pglite";
import {
  createMockStorageService,
  TEST_USER_ID,
  type MockStorageService,
} from "./helpers/photo-test-helper";

describe("PhotoService - Create Photo", () => {
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

    // Seed test user
    await db.insert(schema.userProfiles).values({
      id: TEST_USER_ID,
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      phoneNumber: "+1234567890",
      dateOfBirth: new Date("1990-01-01"),
    });
  });

  afterEach(async () => {
    await client.close();
  });

  it("creates photo with all required fields", async () => {
    // Given
    const data = {
      userProfileId: TEST_USER_ID,
      s3Key: "photos/users/abc/2025-11-03/def.jpg",
      s3Bucket: "test-bucket",
      bytes: 2500000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/test-bucket/photo.jpg",
    };

    // When
    const result = await service.createPhoto(data);

    // Then
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userProfileId).toBe(TEST_USER_ID);
      expect(result.data.s3Key).toBe(data.s3Key);
      expect(result.data.bytes).toBe(2500000);
      expect(result.data.mime).toBe("image/jpeg");
      expect(result.data.status).toBe("uploaded");
      expect(result.data.createdAt).toBeInstanceOf(Date);
    }
  });

  it("creates photo with optional fields", async () => {
    // Given
    const data = {
      userProfileId: TEST_USER_ID,
      s3Key: "photos/users/abc/2025-11-03/def.jpg",
      s3Bucket: "test-bucket",
      bytes: 2500000,
      mime: "image/jpeg",
      imageUrl: "https://s3.amazonaws.com/test-bucket/photo.jpg",
      originalName: "selfie.jpg",
      width: 1920,
      height: 1080,
      weekNumber: 4,
    };

    // When
    const result = await service.createPhoto(data);

    // Then
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.originalName).toBe("selfie.jpg");
      expect(result.data.width).toBe(1920);
      expect(result.data.height).toBe(1080);
      expect(result.data.weekNumber).toBe(4);
    }
  });
});
