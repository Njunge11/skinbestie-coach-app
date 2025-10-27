// Real repository using Drizzle ORM (production)

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";

// Type definitions
export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: Date;
  skinType: string[] | null;
  concerns: string[] | null;
  hasAllergies: boolean | null;
  allergyDetails: string | null;
  isSubscribed: boolean | null;
  hasCompletedBooking: boolean | null;
  occupation: string | null;
  bio: string | null;
  timezone: string;
  completedSteps: string[];
  isCompleted: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

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
      await db
        .update(userProfiles)
        .set(updates)
        .where(eq(userProfiles.id, id));
    },
  };
}
