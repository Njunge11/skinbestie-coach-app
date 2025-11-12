import { db } from "@/lib/db";
import {
  profileTags,
  type ProfileTag,
  type NewProfileTag,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// Re-export types from schema (single source of truth)
export type { ProfileTag, NewProfileTag };

export function makeProfileTagsRepo() {
  return {
    async create(data: NewProfileTag): Promise<ProfileTag> {
      const [created] = await db.insert(profileTags).values(data).returning();
      return created;
    },

    async findByUserProfileId(userProfileId: string): Promise<ProfileTag[]> {
      const tags = await db
        .select({
          id: profileTags.id,
          userProfileId: profileTags.userProfileId,
          tag: profileTags.tag,
          createdAt: profileTags.createdAt,
        })
        .from(profileTags)
        .where(eq(profileTags.userProfileId, userProfileId))
        .orderBy(desc(profileTags.createdAt))
        .limit(100);
      return tags;
    },

    async delete(tagId: string): Promise<boolean> {
      const [deleted] = await db
        .delete(profileTags)
        .where(eq(profileTags.id, tagId))
        .returning();
      return !!deleted;
    },
  };
}
