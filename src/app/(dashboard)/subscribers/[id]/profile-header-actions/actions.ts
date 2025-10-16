"use server";

import { makeUserProfileRepo } from "./user-profile.repo";
import type { UserProfile } from "./user-profile.repo.fake";

// Dependency injection for testing (follows TESTING.md)
export type SubscriberDeps = {
  repo: ReturnType<typeof makeUserProfileRepo>;
  now: () => Date;
  validateId?: (id: string) => boolean;
};

// Default dependencies (production)
const defaultDeps: SubscriberDeps = {
  repo: makeUserProfileRepo(),
  now: () => new Date(),
  validateId: isValidUUID,
};

// Result types
type SuccessResult<T> = { success: true; data: T };
type ErrorResult = { success: false; error: string };
type Result<T> = SuccessResult<T> | ErrorResult;

// User profile view model
export type UserProfileData = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  age: number;
  skinType: string;
  concerns: string[];
  occupation: string;
  bio: string;
};

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
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(
  userId: string,
  deps: SubscriberDeps = defaultDeps
): Promise<Result<UserProfileData>> {
  const { repo, now, validateId = isValidUUID } = deps;

  // Validate userId format
  if (!validateId(userId)) {
    return { success: false, error: "Invalid user ID" };
  }

  // Fetch user from repository
  const user = await repo.getById(userId);

  if (!user) {
    return { success: false, error: "User not found" };
  }

  // Transform data for view
  const data: UserProfileData = {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    mobile: user.phoneNumber,
    age: calculateAge(user.dateOfBirth, now()),
    skinType: user.skinType?.[0] || "Not specified",
    concerns: user.concerns || [],
    occupation: user.occupation || "",
    bio: user.bio || "",
  };

  return { success: true, data };
}

/**
 * Update user profile fields (occupation and/or bio)
 */
export async function updateUserProfile(
  userId: string,
  updates: { occupation?: string; bio?: string },
  deps: SubscriberDeps = defaultDeps
): Promise<Result<void>> {
  const { repo, now, validateId = isValidUUID } = deps;

  // Validate userId format
  if (!validateId(userId)) {
    return { success: false, error: "Invalid data" };
  }

  // Build update data
  const updateData: Partial<UserProfile> = {
    updatedAt: now(),
  };

  if (updates.occupation !== undefined) {
    updateData.occupation = updates.occupation;
  }

  if (updates.bio !== undefined) {
    updateData.bio = updates.bio;
  }

  // Update via repository
  await repo.update(userId, updateData);

  return { success: true, data: undefined };
}
