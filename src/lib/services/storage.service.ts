import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";

export interface PresignUploadRequest {
  userProfileId: string;
  mime: string;
  extension: string;
  bytes: number;
}

export interface PresignUploadResponse {
  uploadUrl: string;
  s3Key: string;
  photoId: string;
}

export interface StorageServiceDeps {
  s3Client: S3Client;
  bucket: string;
  presignedUrlTtl: number;
  uuidGen?: () => string;
}

/**
 * Generate S3 key for photo storage
 * Format: photos/users/{userProfileId}/{YYYY-MM-DD}/{photoId}.{extension}
 */
function generatePhotoKey(
  userProfileId: string,
  photoId: string,
  extension: string,
): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `photos/users/${userProfileId}/${date}/${photoId}.${extension}`;
}

export function makeStorageService(deps?: Partial<StorageServiceDeps>) {
  // Lazy load s3Client to avoid loading AWS config in tests
  const getDefaultS3Client = () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { s3Client } = require("@/lib/aws/s3");
    return s3Client;
  };

  const {
    s3Client: client = getDefaultS3Client(), // Use default S3 client from singleton
    bucket = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || "",
    presignedUrlTtl = Number(process.env.AWS_PRESIGNED_URL_EXPIRATION) || 60, // 60 seconds default
    uuidGen = () => crypto.randomUUID(),
  } = deps || {};

  return {
    /**
     * Generate a presigned URL for uploading a photo to S3
     */
    async generatePresignedUploadUrl(
      request: PresignUploadRequest,
    ): Promise<PresignUploadResponse> {
      const photoId = uuidGen();
      const s3Key = generatePhotoKey(
        request.userProfileId,
        photoId,
        request.extension,
      );

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        ContentType: request.mime,
        Metadata: {
          userProfileId: request.userProfileId,
          originalBytes: request.bytes.toString(),
        },
      });

      const uploadUrl = await getSignedUrl(client, command, {
        expiresIn: presignedUrlTtl,
      });

      return {
        uploadUrl,
        s3Key,
        photoId,
      };
    },

    /**
     * Delete a photo from S3
     */
    async deletePhoto(s3Key: string): Promise<void> {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: s3Key,
      });

      await client.send(command);
    },

    /**
     * Delete multiple photos from S3
     */
    async deletePhotos(s3Keys: string[]): Promise<void> {
      await Promise.all(s3Keys.map((key) => this.deletePhoto(key)));
    },

    /**
     * Generate a presigned URL for downloading a photo from S3
     */
    async generatePresignedDownloadUrl(
      s3Key: string,
      expiresIn: number = 3600,
    ): Promise<string> {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: s3Key,
      });

      return await getSignedUrl(client, command, { expiresIn });
    },
  };
}

// Singleton instance - lazy loaded to avoid loading AWS config in tests
let storageServiceInstance: ReturnType<typeof makeStorageService> | null = null;

export const storageService = new Proxy(
  {} as ReturnType<typeof makeStorageService>,
  {
    get(_target, prop) {
      if (!storageServiceInstance) {
        storageServiceInstance = makeStorageService();
      }
      return storageServiceInstance[
        prop as keyof ReturnType<typeof makeStorageService>
      ];
    },
  },
);
