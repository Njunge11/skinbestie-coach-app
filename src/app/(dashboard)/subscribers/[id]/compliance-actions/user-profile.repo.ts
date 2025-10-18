/**
 * Real repository for user profiles using Drizzle ORM
 */

import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type UserProfile = {
  id: string;
  timezone: string;
};

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
