import { db } from "@/lib/db";
import { progressPhotos } from "@/lib/db/schema";
import { storageService } from "./storage.service";
import { eq, and, desc } from "drizzle-orm";
import { getCloudFrontUrl } from "@/lib/utils/cloudfront";

export interface CreatePhotoData {
  userProfileId: string;
  s3Key: string;
  s3Bucket: string;
  bytes: number;
  mime: string;
  imageUrl: string;
  originalName?: string;
  width?: number;
  height?: number;
  weekNumber?: number;
}

export interface ListPhotosParams {
  userProfileId: string;
  limit: number;
  offset: number;
  weekNumber?: number;
}

export interface UpdatePhotoData {
  status?: string;
  feedback?: string;
  weekNumber?: number;
}

export interface PhotoServiceDeps {
  db: typeof db;
  storageService: StorageService;
}

type StorageService = ReturnType<
  typeof import("./storage.service").makeStorageService
>;

export function makePhotoService(deps?: Partial<PhotoServiceDeps>) {
  const { db: database = db, storageService: storage = storageService } =
    deps || {};

  return {
    /**
     * Create a new photo record
     */
    async createPhoto(data: CreatePhotoData) {
      try {
        // Use CloudFront URL instead of S3 URL for image access
        const cloudFrontUrl = getCloudFrontUrl(data.s3Key, data.s3Bucket);

        const [photo] = await database
          .insert(progressPhotos)
          .values({
            userProfileId: data.userProfileId,
            imageUrl: cloudFrontUrl, // Store CloudFront URL
            s3Key: data.s3Key,
            s3Bucket: data.s3Bucket,
            bytes: data.bytes,
            mime: data.mime,
            originalName: data.originalName,
            width: data.width,
            height: data.height,
            weekNumber: data.weekNumber,
            status: "uploaded",
          })
          .returning();

        return { success: true as const, data: photo };
      } catch (error) {
        return {
          success: false as const,
          error:
            error instanceof Error ? error.message : "Failed to create photo",
        };
      }
    },

    /**
     * Get a photo by ID
     * Only returns the photo if it belongs to the specified user
     */
    async getPhotoById(photoId: string, userProfileId: string) {
      try {
        const [photo] = await database
          .select()
          .from(progressPhotos)
          .where(
            and(
              eq(progressPhotos.id, photoId),
              eq(progressPhotos.userProfileId, userProfileId),
            ),
          )
          .limit(1);

        if (!photo) {
          return {
            success: false as const,
            error: "Photo not found",
          };
        }

        return { success: true as const, data: photo };
      } catch (error) {
        return {
          success: false as const,
          error: error instanceof Error ? error.message : "Failed to get photo",
        };
      }
    },

    /**
     * List photos for a user with pagination and optional filtering
     */
    async listPhotos(params: ListPhotosParams) {
      try {
        // Build where conditions
        const conditions = [
          eq(progressPhotos.userProfileId, params.userProfileId),
        ];

        if (params.weekNumber !== undefined) {
          conditions.push(eq(progressPhotos.weekNumber, params.weekNumber));
        }

        const photos = await database
          .select()
          .from(progressPhotos)
          .where(and(...conditions))
          .orderBy(desc(progressPhotos.uploadedAt))
          .limit(params.limit)
          .offset(params.offset);

        return { success: true as const, data: photos };
      } catch (error) {
        return {
          success: false as const,
          error:
            error instanceof Error ? error.message : "Failed to list photos",
        };
      }
    },

    /**
     * Update photo metadata
     * Only allows updating if the photo belongs to the specified user
     */
    async updatePhoto(
      photoId: string,
      userProfileId: string,
      data: UpdatePhotoData,
    ) {
      try {
        // First check if photo exists and belongs to user
        const photoResult = await this.getPhotoById(photoId, userProfileId);
        if (!photoResult.success) {
          return photoResult;
        }

        // Update the photo
        const [updated] = await database
          .update(progressPhotos)
          .set({
            status: data.status,
            feedback: data.feedback,
            weekNumber: data.weekNumber,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(progressPhotos.id, photoId),
              eq(progressPhotos.userProfileId, userProfileId),
            ),
          )
          .returning();

        return { success: true as const, data: updated };
      } catch (error) {
        return {
          success: false as const,
          error:
            error instanceof Error ? error.message : "Failed to update photo",
        };
      }
    },

    /**
     * Delete a photo
     * Deletes from both DB and S3. S3 deletion failures are ignored (graceful degradation)
     */
    async deletePhoto(photoId: string, userProfileId: string) {
      try {
        // First check if photo exists and belongs to user
        const photoResult = await this.getPhotoById(photoId, userProfileId);
        if (!photoResult.success) {
          return photoResult;
        }

        const photo = photoResult.data;

        // Try to delete from S3 if S3 key exists (ignore failures)
        if (photo.s3Key) {
          try {
            await storage.deletePhoto(photo.s3Key);
          } catch (error) {
            // Log but don't fail - we'll delete from DB anyway
            console.error("S3 deletion failed:", error);
          }
        }

        // Delete from database
        await database
          .delete(progressPhotos)
          .where(
            and(
              eq(progressPhotos.id, photoId),
              eq(progressPhotos.userProfileId, userProfileId),
            ),
          );

        return { success: true as const, data: { id: photoId } };
      } catch (error) {
        return {
          success: false as const,
          error:
            error instanceof Error ? error.message : "Failed to delete photo",
        };
      }
    },
  };
}

// Singleton instance
export const photoService = makePhotoService();
