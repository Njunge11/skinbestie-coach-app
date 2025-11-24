import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { makeStorageService } from "../storage.service";
import type { S3Client } from "@aws-sdk/client-s3";

// Mock the AWS SDK modules
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface MockS3Client {
  send: Mock;
}

describe("StorageService - Generate Presigned Upload URL", () => {
  // Test UUIDs
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const photoId = "650e8400-e29b-41d4-a716-446655440001";

  let mockS3Client: MockS3Client;
  let service: ReturnType<typeof makeStorageService>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock S3 client (simple version - only what we use)
    mockS3Client = {
      send: vi.fn(),
    };

    // Mock getSignedUrl to return a fake presigned URL
    vi.mocked(getSignedUrl).mockResolvedValue(
      "https://test-bucket.s3.amazonaws.com/mock-presigned-url?signature=xyz",
    );

    // Create service with mock dependencies
    service = makeStorageService({
      s3Client: mockS3Client as unknown as S3Client,
      bucket: "test-bucket",
      presignedUrlTtl: 60,
      uuidGen: () => photoId,
    });
  });

  it("generates presigned upload URL with correct S3 key structure", async () => {
    // Given - service is set up with fixed UUID generator

    // When
    const result = await service.generatePresignedUploadUrl({
      userProfileId: userId,
      mime: "image/jpeg",
      extension: "jpg",
      bytes: 2500000,
    });

    // Then
    expect(result.photoId).toBe(photoId);
    expect(result.s3Key).toMatch(
      /photos\/users\/550e8400-e29b-41d4-a716-446655440000\/\d{4}-\d{2}-\d{2}\/650e8400-e29b-41d4-a716-446655440001\.jpg/,
    );
    expect(result.uploadUrl).toBeDefined();
    expect(typeof result.uploadUrl).toBe("string");
  });

  it("returns different photoId for each upload request", async () => {
    // Given - service with real UUID generator
    const serviceWithRealUuid = makeStorageService({
      s3Client: mockS3Client as unknown as S3Client,
      bucket: "test-bucket",
      presignedUrlTtl: 60,
    });

    // When
    const result1 = await serviceWithRealUuid.generatePresignedUploadUrl({
      userProfileId: userId,
      mime: "image/jpeg",
      extension: "jpg",
      bytes: 2500000,
    });

    const result2 = await serviceWithRealUuid.generatePresignedUploadUrl({
      userProfileId: userId,
      mime: "image/jpeg",
      extension: "jpg",
      bytes: 2500000,
    });

    // Then - each upload gets unique ID
    expect(result1.photoId).not.toBe(result2.photoId);
    expect(result1.s3Key).not.toBe(result2.s3Key);
  });

  it("includes date in S3 key for organisation", async () => {
    // When
    const result = await service.generatePresignedUploadUrl({
      userProfileId: userId,
      mime: "image/png",
      extension: "png",
      bytes: 3000000,
    });

    // Then - key includes YYYY-MM-DD format
    const dateRegex = /\d{4}-\d{2}-\d{2}/;
    expect(result.s3Key).toMatch(dateRegex);
  });
});

describe("StorageService - Delete Photo", () => {
  let mockS3Client: MockS3Client;
  let service: ReturnType<typeof makeStorageService>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock S3 client
    mockS3Client = {
      send: vi.fn(),
    };

    // Create service with mock dependencies
    service = makeStorageService({
      s3Client: mockS3Client as unknown as S3Client,
      bucket: "test-bucket",
      presignedUrlTtl: 60,
    });
  });

  it("sends delete command with correct bucket and key", async () => {
    // Given
    const s3Key = "photos/users/abc/2025-11-03/def.jpg";
    mockS3Client.send.mockResolvedValue({});

    // When
    await service.deletePhoto(s3Key);

    // Then
    expect(mockS3Client.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Bucket: "test-bucket",
          Key: s3Key,
        }),
      }),
    );
  });

  it("handles S3 deletion errors by propagating them", async () => {
    // Given
    const s3Key = "photos/users/abc/2025-11-03/def.jpg";
    mockS3Client.send.mockRejectedValue(new Error("S3 connection failed"));

    // When/Then - error should propagate
    await expect(service.deletePhoto(s3Key)).rejects.toThrow(
      "S3 connection failed",
    );
  });
});

describe("StorageService - Delete Multiple Photos", () => {
  let mockS3Client: MockS3Client;
  let service: ReturnType<typeof makeStorageService>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock S3 client
    mockS3Client = {
      send: vi.fn(),
    };

    // Create service with mock dependencies
    service = makeStorageService({
      s3Client: mockS3Client as unknown as S3Client,
      bucket: "test-bucket",
      presignedUrlTtl: 60,
    });
  });

  it("deletes multiple photos by calling deletePhoto for each", async () => {
    // Given
    const s3Keys = [
      "photos/users/abc/2025-11-03/photo1.jpg",
      "photos/users/abc/2025-11-03/photo2.jpg",
      "photos/users/abc/2025-11-03/photo3.jpg",
    ];
    mockS3Client.send.mockResolvedValue({});

    // When
    await service.deletePhotos(s3Keys);

    // Then - each photo gets deleted
    expect(mockS3Client.send).toHaveBeenCalledTimes(3);
  });

  it("deletes all photos even if one fails", async () => {
    // Given
    const s3Keys = [
      "photos/users/abc/photo1.jpg",
      "photos/users/abc/photo2.jpg",
      "photos/users/abc/photo3.jpg",
    ];

    // Mock: first call fails, others succeed
    mockS3Client.send
      .mockRejectedValueOnce(new Error("S3 error"))
      .mockResolvedValue({});

    // When/Then - Promise.all will reject if any fail
    await expect(service.deletePhotos(s3Keys)).rejects.toThrow("S3 error");

    // But it still attempted all deletions in parallel
    expect(mockS3Client.send).toHaveBeenCalledTimes(3);
  });
});

describe("StorageService - Generate Presigned Download URL", () => {
  let mockS3Client: MockS3Client;
  let service: ReturnType<typeof makeStorageService>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock S3 client
    mockS3Client = {
      send: vi.fn(),
    };

    // Mock getSignedUrl to return a fake presigned URL
    vi.mocked(getSignedUrl).mockResolvedValue(
      "https://test-bucket.s3.amazonaws.com/mock-download-url?signature=abc",
    );

    // Create service with mock dependencies
    service = makeStorageService({
      s3Client: mockS3Client as unknown as S3Client,
      bucket: "test-bucket",
      presignedUrlTtl: 60,
    });
  });

  it("generates download URL for given S3 key", async () => {
    // Given
    const s3Key = "photos/users/abc/2025-11-03/def.jpg";

    // When
    const url = await service.generatePresignedDownloadUrl(s3Key);

    // Then - should return a URL string
    expect(typeof url).toBe("string");
    expect(url.length).toBeGreaterThan(0);
  });

  it("accepts custom expiry time", async () => {
    // Given
    const s3Key = "photos/users/abc/2025-11-03/def.jpg";
    const customExpiry = 7200; // 2 hours

    // When
    const url = await service.generatePresignedDownloadUrl(s3Key, customExpiry);

    // Then - should return a URL
    expect(typeof url).toBe("string");
    expect(url.length).toBeGreaterThan(0);

    // Verify getSignedUrl was called with custom expiry
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: customExpiry }),
    );
  });
});
