// Repository layer for profile data access
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { type UserProfile } from "@/lib/db/schema";

// Derive types from centralized schema (TYPE_SYSTEM_GUIDE.md)
export type ProfileUpdateData = Partial<
  Pick<
    UserProfile,
    | "nickname"
    | "firstName"
    | "lastName"
    | "email"
    | "phoneNumber"
    | "dateOfBirth"
    | "skinType"
    | "concerns"
    | "hasAllergies"
    | "allergyDetails"
    | "occupation"
    | "bio"
    | "timezone"
    | "hasCompletedSkinTest"
    | "hasCompletedBooking"
    | "isSubscribed"
    | "completedSteps"
    | "isCompleted"
    | "completedAt"
  >
>;

export type ProfileData = Pick<
  UserProfile,
  | "id"
  | "userId"
  | "firstName"
  | "lastName"
  | "email"
  | "nickname"
  | "phoneNumber"
  | "updatedAt"
>;

// For dependency injection in tests
export type ProfileRepoDeps = {
  db?:
    | typeof db
    | PostgresJsDatabase<typeof schema>
    | PgliteDatabase<typeof schema>;
};

export function makeProfileRepo(deps: ProfileRepoDeps = {}) {
  const database = deps.db || db;

  return {
    /**
     * Get user profile by auth user ID
     */
    async getProfileByUserId(userId: string): Promise<ProfileData | null> {
      const result = await database
        .select({
          id: schema.userProfiles.id,
          userId: schema.userProfiles.userId,
          firstName: schema.userProfiles.firstName,
          lastName: schema.userProfiles.lastName,
          email: schema.userProfiles.email,
          nickname: schema.userProfiles.nickname,
          phoneNumber: schema.userProfiles.phoneNumber,
          updatedAt: schema.userProfiles.updatedAt,
        })
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, userId))
        .limit(1);

      return result[0] || null;
    },

    /**
     * Update user profile
     */
    async updateProfile(
      userId: string,
      updates: ProfileUpdateData,
    ): Promise<ProfileData | null> {
      const result = await database
        .update(schema.userProfiles)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(schema.userProfiles.userId, userId))
        .returning();

      if (!result[0]) return null;

      // Return only the fields we need for ProfileData
      return {
        id: result[0].id,
        userId: result[0].userId,
        firstName: result[0].firstName,
        lastName: result[0].lastName,
        email: result[0].email,
        nickname: result[0].nickname,
        phoneNumber: result[0].phoneNumber,
        updatedAt: result[0].updatedAt,
      };
    },
  };
}
