/**
 * Real repository for user profiles using Drizzle ORM
 */

import { db as defaultDb, type DrizzleDB } from "@/lib/db";
import {
  userProfiles,
  type UserProfile as UserProfileBase,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Derive type from centralized schema (TYPE_SYSTEM_GUIDE.md)
export type UserProfile = Pick<UserProfileBase, "id" | "timezone">;

export function makeUserProfileRepo({
  db = defaultDb,
}: { db?: DrizzleDB } = {}) {
  return {
    /**
     * Find a user profile by ID
     */
    async findById(id: string) {
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
