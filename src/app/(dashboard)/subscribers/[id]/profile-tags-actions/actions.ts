"use server";

import { makeProfileTagsRepo, type ProfileTag } from "./profile-tags.repo";
import { revalidatePath } from "next/cache";

// Result types
type SuccessResult<T> = { success: true; data: T };
type ErrorResult = { success: false; error: string };
type Result<T> = SuccessResult<T> | ErrorResult;

// Dependencies type
export type ProfileTagsDeps = {
  repo: ReturnType<typeof makeProfileTagsRepo>;
};

const defaultDeps: ProfileTagsDeps = {
  repo: makeProfileTagsRepo(),
};

// Validation constants
const MAX_TAG_LENGTH = 100;

/**
 * Add a tag to a user profile
 */
export async function addProfileTag(
  userProfileId: string,
  tag: string,
  deps: ProfileTagsDeps = defaultDeps,
): Promise<Result<ProfileTag>> {
  const { repo } = deps;

  // Validate inputs
  const trimmedTag = tag.trim();

  if (!trimmedTag) {
    return {
      success: false,
      error: "Tag cannot be empty",
    };
  }

  if (trimmedTag.length > MAX_TAG_LENGTH) {
    return {
      success: false,
      error: "Tag must be 100 characters or less",
    };
  }

  try {
    // Check for duplicates (case-insensitive)
    const existingTags = await repo.findByUserProfileId(userProfileId);
    const isDuplicate = existingTags.some(
      (t) => t.tag.toLowerCase() === trimmedTag.toLowerCase(),
    );

    if (isDuplicate) {
      return {
        success: false,
        error: "Tag already exists",
      };
    }

    // Create the tag
    const newTag = await repo.create({
      userProfileId,
      tag: trimmedTag,
    });

    // Revalidate the page to show new tag
    revalidatePath(`/subscribers/${userProfileId}`);

    return {
      success: true,
      data: newTag,
    };
  } catch {
    return {
      success: false,
      error: "Failed to add tag",
    };
  }
}

/**
 * Get all tags for a user profile
 */
export async function getProfileTags(
  userProfileId: string,
  deps: ProfileTagsDeps = defaultDeps,
): Promise<Result<ProfileTag[]>> {
  const { repo } = deps;

  try {
    const tags = await repo.findByUserProfileId(userProfileId);

    return {
      success: true,
      data: tags,
    };
  } catch {
    return {
      success: false,
      error: "Failed to fetch tags",
    };
  }
}

/**
 * Remove a tag from a user profile
 */
export async function removeProfileTag(
  tagId: string,
  userProfileId: string,
  deps: ProfileTagsDeps = defaultDeps,
): Promise<{ success: true } | { success: false; error: string }> {
  const { repo } = deps;

  // Validate input
  if (!tagId || !tagId.trim()) {
    return {
      success: false,
      error: "Invalid tag ID",
    };
  }

  try {
    const deleted = await repo.delete(tagId);

    if (!deleted) {
      return {
        success: false,
        error: "Tag not found",
      };
    }

    // Revalidate the page to remove tag from UI
    revalidatePath(`/subscribers/${userProfileId}`);

    return {
      success: true,
    };
  } catch {
    return {
      success: false,
      error: "Failed to remove tag",
    };
  }
}
