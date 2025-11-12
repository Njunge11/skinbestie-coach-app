// Real repository using Drizzle ORM (production)

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  userProfiles,
  type UserProfile as UserProfileBase,
} from "@/lib/db/schema";

// Derive type from centralized schema (TYPE_SYSTEM_GUIDE.md)
export type UserProfile = Pick<
  UserProfileBase,
  | "id"
  | "firstName"
  | "lastName"
  | "email"
  | "phoneNumber"
  | "dateOfBirth"
  | "nickname"
  | "skinType"
  | "concerns"
  | "hasAllergies"
  | "allergyDetails"
  | "isSubscribed"
  | "hasCompletedBooking"
  | "occupation"
  | "bio"
  | "timezone"
  | "completedSteps"
  | "isCompleted"
  | "completedAt"
  | "createdAt"
  | "updatedAt"
>;

export function makeUserProfileRepo() {
  return {
    async getById(id: string): Promise<UserProfile | null> {
      const [user] = await db
        .select({
          id: userProfiles.id,
          firstName: userProfiles.firstName,
          lastName: userProfiles.lastName,
          email: userProfiles.email,
          phoneNumber: userProfiles.phoneNumber,
          dateOfBirth: userProfiles.dateOfBirth,
          nickname: userProfiles.nickname,
          skinType: userProfiles.skinType,
          concerns: userProfiles.concerns,
          hasAllergies: userProfiles.hasAllergies,
          allergyDetails: userProfiles.allergyDetails,
          isSubscribed: userProfiles.isSubscribed,
          hasCompletedBooking: userProfiles.hasCompletedBooking,
          occupation: userProfiles.occupation,
          bio: userProfiles.bio,
          timezone: userProfiles.timezone,
          completedSteps: userProfiles.completedSteps,
          isCompleted: userProfiles.isCompleted,
          completedAt: userProfiles.completedAt,
          createdAt: userProfiles.createdAt,
          updatedAt: userProfiles.updatedAt,
        })
        .from(userProfiles)
        .where(eq(userProfiles.id, id))
        .limit(1);

      return user ? (user as UserProfile) : null;
    },

    async update(id: string, updates: Partial<UserProfile>): Promise<void> {
      await db.update(userProfiles).set(updates).where(eq(userProfiles.id, id));
    },
  };
}
