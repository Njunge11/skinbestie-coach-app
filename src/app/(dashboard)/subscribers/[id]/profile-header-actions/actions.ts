"use server";

import { z } from "zod";
import { makeUserProfileRepo } from "./user-profile.repo";
import type { UserProfile } from "./user-profile.repo";

// Dependency injection for testing (follows TESTING.md)
export type SubscriberDeps = {
  repo: ReturnType<typeof makeUserProfileRepo>;
  now: () => Date;
};

// Default dependencies (production)
const defaultDeps: SubscriberDeps = {
  repo: makeUserProfileRepo(),
  now: () => new Date(),
};

// Result types
type SuccessResult<T> = { success: true; data: T };
type ErrorResult = { success: false; error: string };
type Result<T> = SuccessResult<T> | ErrorResult;

// User profile view model
export type UserProfileData = {
  id: string;
  name: string;
  nickname: string | null;
  email: string;
  mobile: string;
  age: number;
  skinType: string;
  concerns: string[];
  occupation: string;
  bio: string;
  feedbackSurveyVisible: boolean;
  createdAt: Date;
};

// Zod schemas for validation
const uuidSchema = z.string().uuid();

const updateUserProfileSchema = z.object({
  userId: uuidSchema,
  occupation: z.string().optional(),
  bio: z.string().optional(),
});

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth: Date, now: Date): number {
  const age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = now.getMonth() - dateOfBirth.getMonth();
  const dayDiff = now.getDate() - dateOfBirth.getDate();

  // Subtract 1 if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    return age - 1;
  }

  return age;
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(
  userId: string,
  deps: SubscriberDeps = defaultDeps,
): Promise<Result<UserProfileData>> {
  const { repo, now } = deps;

  // Validate userId with Zod
  const validation = uuidSchema.safeParse(userId);
  if (!validation.success) {
    return { success: false, error: "Invalid user ID" };
  }

  try {
    // Fetch user from repository
    const user = await repo.getById(validation.data);

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Transform data for view
    const data: UserProfileData = {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      nickname: user.nickname || null,
      email: user.email,
      mobile: user.phoneNumber,
      age: calculateAge(user.dateOfBirth, now()),
      skinType: user.skinType?.[0] || "Not specified",
      concerns: user.concerns || [],
      occupation: user.occupation || "",
      bio: user.bio || "",
      feedbackSurveyVisible: user.feedbackSurveyVisible,
      createdAt: user.createdAt,
    };

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return { success: false, error: "Failed to fetch user profile" };
  }
}

/**
 * Update user profile fields (occupation and/or bio)
 */
export async function updateUserProfile(
  userId: string,
  updates: { occupation?: string; bio?: string },
  deps: SubscriberDeps = defaultDeps,
): Promise<Result<void>> {
  const { repo, now } = deps;

  // Validate input with Zod
  const validation = updateUserProfileSchema.safeParse({
    userId,
    ...updates,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Build update data
    const updateData: Partial<UserProfile> = {
      updatedAt: now(),
    };

    if (validation.data.occupation !== undefined) {
      updateData.occupation = validation.data.occupation;
    }

    if (validation.data.bio !== undefined) {
      updateData.bio = validation.data.bio;
    }

    // Update via repository
    await repo.update(validation.data.userId, updateData);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return { success: false, error: "Failed to update user profile" };
  }
}
