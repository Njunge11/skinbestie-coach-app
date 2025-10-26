import { db } from "@/lib/db";
import { progressPhotos, type ProgressPhoto, type NewProgressPhoto } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export function makeProgressPhotosRepo() {
  return {
    async findByUserId(userId: string): Promise<ProgressPhoto[]> {
      const photos = await db
        .select({
          id: progressPhotos.id,
          userProfileId: progressPhotos.userProfileId,
          imageUrl: progressPhotos.imageUrl,
          weekNumber: progressPhotos.weekNumber,
          uploadedAt: progressPhotos.uploadedAt,
          feedback: progressPhotos.feedback,
          createdAt: progressPhotos.createdAt,
          updatedAt: progressPhotos.updatedAt,
        })
        .from(progressPhotos)
        .where(eq(progressPhotos.userProfileId, userId))
        .orderBy(desc(progressPhotos.uploadedAt));

      return photos;
    },

    async findByUserIdAndWeek(
      userId: string,
      weekNumber: number
    ): Promise<ProgressPhoto[]> {
      const photos = await db
        .select({
          id: progressPhotos.id,
          userProfileId: progressPhotos.userProfileId,
          imageUrl: progressPhotos.imageUrl,
          weekNumber: progressPhotos.weekNumber,
          uploadedAt: progressPhotos.uploadedAt,
          feedback: progressPhotos.feedback,
          createdAt: progressPhotos.createdAt,
          updatedAt: progressPhotos.updatedAt,
        })
        .from(progressPhotos)
        .where(
          and(
            eq(progressPhotos.userProfileId, userId),
            eq(progressPhotos.weekNumber, weekNumber)
          )
        )
        .orderBy(desc(progressPhotos.uploadedAt));

      return photos;
    },

    async findById(id: string): Promise<ProgressPhoto | null> {
      const result = await db
        .select({
          id: progressPhotos.id,
          userProfileId: progressPhotos.userProfileId,
          imageUrl: progressPhotos.imageUrl,
          weekNumber: progressPhotos.weekNumber,
          uploadedAt: progressPhotos.uploadedAt,
          feedback: progressPhotos.feedback,
          createdAt: progressPhotos.createdAt,
          updatedAt: progressPhotos.updatedAt,
        })
        .from(progressPhotos)
        .where(eq(progressPhotos.id, id))
        .limit(1);

      return result[0] ?? null;
    },

    async create(photo: NewProgressPhoto): Promise<ProgressPhoto> {
      const result = await db
        .insert(progressPhotos)
        .values(photo)
        .returning();

      return result[0];
    },

    async update(
      id: string,
      updates: Partial<ProgressPhoto>
    ): Promise<ProgressPhoto | null> {
      const result = await db
        .update(progressPhotos)
        .set(updates)
        .where(eq(progressPhotos.id, id))
        .returning();

      return result[0] ?? null;
    },

    async deleteById(id: string): Promise<ProgressPhoto | null> {
      const result = await db
        .delete(progressPhotos)
        .where(eq(progressPhotos.id, id))
        .returning();

      return result[0] ?? null;
    },
  };
}
