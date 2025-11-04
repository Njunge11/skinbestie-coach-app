import { vi } from "vitest";

export type MockStorageService = {
  generatePresignedUploadUrl: ReturnType<typeof vi.fn>;
  deletePhoto: ReturnType<typeof vi.fn>;
  deletePhotos: ReturnType<typeof vi.fn>;
  generatePresignedDownloadUrl: ReturnType<typeof vi.fn>;
};

export function createMockStorageService(): MockStorageService {
  return {
    generatePresignedUploadUrl: vi.fn().mockResolvedValue({
      uploadUrl: "https://s3.amazonaws.com/upload-url",
      s3Key: "photos/users/test/photo.jpg",
      photoId: "test-photo-id",
    }),
    deletePhoto: vi.fn().mockResolvedValue(undefined),
    deletePhotos: vi.fn().mockResolvedValue(undefined),
    generatePresignedDownloadUrl: vi
      .fn()
      .mockResolvedValue("https://s3.amazonaws.com/signed-url"),
  };
}

export const TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000";
export const OTHER_USER_ID = "550e8400-e29b-41d4-a716-446655440099";
export const NON_EXISTENT_ID = "999e9999-e99b-99d9-a999-999999999999";
