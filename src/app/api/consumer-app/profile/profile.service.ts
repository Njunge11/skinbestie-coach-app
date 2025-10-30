// Service layer for profile business logic
import { makeProfileRepo } from "./profile.repo";
import type { ProfileData, ProfileUpdateData } from "./profile.repo";

export type ProfileServiceDeps = {
  repo?: ReturnType<typeof makeProfileRepo>;
};

export type ProfileServiceResult =
  | { success: true; data: ProfileData }
  | { success: false; error: string };

export function makeProfileService(deps: ProfileServiceDeps = {}) {
  const repo = deps.repo || makeProfileRepo({});

  return {
    /**
     * Update user profile with partial data
     */
    async updateProfile(
      userId: string,
      updates: ProfileUpdateData,
    ): Promise<ProfileServiceResult> {
      try {
        // Validate input
        if (!userId) {
          return { success: false, error: "User ID is required" };
        }

        // Check if profile exists
        const existingProfile = await repo.getProfileByUserId(userId);
        if (!existingProfile) {
          return { success: false, error: "User not found" };
        }

        // Update profile
        const updatedProfile = await repo.updateProfile(userId, updates);
        if (!updatedProfile) {
          return { success: false, error: "Failed to update profile" };
        }

        return { success: true, data: updatedProfile };
      } catch (error) {
        console.error("Error updating profile:", error);
        return {
          success: false,
          error: "Failed to update profile",
        };
      }
    },
  };
}
