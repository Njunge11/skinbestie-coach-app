"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Result } from "@/lib/result";

// Validation schema
const userIdSchema = z.string().uuid();

// Repository interface
type UserProfileRepo = {
  findById(
    id: string,
  ): Promise<{ id: string; feedbackSurveyVisible: boolean } | null>;
  update(
    id: string,
    data: Partial<{ feedbackSurveyVisible: boolean }>,
  ): Promise<{ id: string; feedbackSurveyVisible: boolean } | null>;
};

// Default production repository
const defaultRepo: UserProfileRepo = {
  async findById(id: string) {
    const [profile] = await db
      .select({
        id: userProfiles.id,
        feedbackSurveyVisible: userProfiles.feedbackSurveyVisible,
      })
      .from(userProfiles)
      .where(eq(userProfiles.id, id))
      .limit(1);

    return profile || null;
  },

  async update(id: string, data: Partial<{ feedbackSurveyVisible: boolean }>) {
    const [updated] = await db
      .update(userProfiles)
      .set(data)
      .where(eq(userProfiles.id, id))
      .returning();

    if (!updated) return null;

    return {
      id: updated.id,
      feedbackSurveyVisible: updated.feedbackSurveyVisible,
    };
  },
};

// Dependency injection for testing
export type ToggleSurveyVisibilityDeps = {
  repo: UserProfileRepo;
};

/**
 * Toggle feedback survey visibility for a user
 * Flips the boolean value from true to false or false to true
 */
export async function toggleSurveyVisibility(
  userId: string,
  deps: ToggleSurveyVisibilityDeps = { repo: defaultRepo },
): Promise<Result<{ id: string; feedbackSurveyVisible: boolean }>> {
  try {
    // Validate userId
    const validation = userIdSchema.safeParse(userId);
    if (!validation.success) {
      return { success: false, error: "Invalid user ID" };
    }

    const { repo } = deps;

    // Get current state
    const profile = await repo.findById(userId);
    if (!profile) {
      return { success: false, error: "User profile not found" };
    }

    // Toggle the value
    const newValue = !profile.feedbackSurveyVisible;

    // Update in database
    const updated = await repo.update(userId, {
      feedbackSurveyVisible: newValue,
    });

    if (!updated) {
      return { success: false, error: "Failed to update survey visibility" };
    }

    // Revalidate the subscriber page
    revalidatePath(`/subscribers/${userId}`);

    return { success: true, data: updated };
  } catch (error) {
    console.error("Error toggling survey visibility:", error);
    return { success: false, error: "Failed to toggle survey visibility" };
  }
}
