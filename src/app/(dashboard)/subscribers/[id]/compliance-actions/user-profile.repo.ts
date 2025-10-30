/**
 * Real repository for user profiles using Drizzle ORM
 */

import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { type UserProfileRow } from "@/lib/db/types";
import { eq } from "drizzle-orm";

// Derive type from centralized schema (TYPE_SYSTEM_GUIDE.md)
export type UserProfile = Pick<UserProfileRow, "id" | "timezone">;

export function makeUserProfileRepo() {
  return {
    /**
     * Find a user profile by ID
     */
    async findById(id: string): Promise<UserProfile | null> {
      const [result] = await db
        .select({
          id: userProfiles.id,
          timezone: userProfiles.timezone,
        })
        .from(userProfiles)
        .where(eq(userProfiles.id, id))
        .limit(1);

      return (result as UserProfile) ?? null;
    },
  };
}
