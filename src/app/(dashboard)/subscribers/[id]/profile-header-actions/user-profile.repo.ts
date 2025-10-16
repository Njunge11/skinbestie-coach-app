// Real repository using Drizzle ORM (production)

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import type { UserProfile } from "./user-profile.repo.fake";

export function makeUserProfileRepo() {
  return {
    async getById(id: string): Promise<UserProfile | null> {
      const [user] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, id))
        .limit(1);

      return user ? (user as UserProfile) : null;
    },

    async update(id: string, updates: Partial<UserProfile>): Promise<void> {
      await db
        .update(userProfiles)
        .set(updates)
        .where(eq(userProfiles.id, id));
    },
  };
}
