"use server";

import { z } from "zod";
import { makeProgressPhotosRepo } from "./progress-photos.repo";
import type { ProgressPhoto } from "@/lib/db/schema";

// Dependency injection for testing (follows TESTING.md)
export type ProgressPhotoDeps = {
  repo: ReturnType<typeof makeProgressPhotosRepo>;
  now: () => Date;
};

// Default dependencies (production)
const defaultDeps: ProgressPhotoDeps = {
  repo: makeProgressPhotosRepo(),
  now: () => new Date(),
};

// Result types
type SuccessResult<T> = { success: true; data: T };
type ErrorResult = { success: false; error: string };
type Result<T> = SuccessResult<T> | ErrorResult;

// Input types
export type CreateProgressPhotoInput = {
  imageUrl: string;
  weekNumber: number;
  feedback?: string;
};

// Zod schemas for validation
const stringRequiredSchema = z.string().trim().min(1);
const weekNumberSchema = z.number().int().min(1); // Week must be >= 1

const getUserPhotosSchema = z.object({
  userId: stringRequiredSchema,
});

const getPhotosByWeekSchema = z.object({
  userId: stringRequiredSchema,
  weekNumber: weekNumberSchema,
});

const createPhotoSchema = z.object({
  userId: stringRequiredSchema,
  imageUrl: stringRequiredSchema,
  weekNumber: weekNumberSchema,
  feedback: z.string().trim().optional(),
});

const updateFeedbackSchema = z.object({
  photoId: stringRequiredSchema,
  feedback: z.string().trim(),
});

const deletePhotoSchema = z.object({
  photoId: stringRequiredSchema,
});

/**
 * Get all progress photos for a user, sorted by upload date (newest first)
 */
export async function getProgressPhotos(
  userId: string,
  deps: ProgressPhotoDeps = defaultDeps
): Promise<Result<ProgressPhoto[]>> {
  const { repo } = deps;

  // Validate input with Zod
  const validation = getUserPhotosSchema.safeParse({ userId });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    const photos = await repo.findByUserId(validation.data.userId);
    return { success: true, data: photos };
  } catch (error) {
    console.error("Error fetching progress photos:", error);
    return { success: false, error: "Failed to fetch progress photos" };
  }
}

/**
 * Get progress photos for a user filtered by week number
 */
export async function getProgressPhotosByWeek(
  userId: string,
  weekNumber: number,
  deps: ProgressPhotoDeps = defaultDeps
): Promise<Result<ProgressPhoto[]>> {
  const { repo } = deps;

  // Validate input with Zod
  const validation = getPhotosByWeekSchema.safeParse({ userId, weekNumber });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    const photos = await repo.findByUserIdAndWeek(
      validation.data.userId,
      validation.data.weekNumber
    );
    return { success: true, data: photos };
  } catch (error) {
    console.error("Error fetching progress photos by week:", error);
    return { success: false, error: "Failed to fetch progress photos" };
  }
}

/**
 * Create a new progress photo for a user
 */
export async function createProgressPhoto(
  userId: string,
  input: CreateProgressPhotoInput,
  deps: ProgressPhotoDeps = defaultDeps
): Promise<Result<ProgressPhoto>> {
  const { repo, now } = deps;

  // Validate input with Zod
  const validation = createPhotoSchema.safeParse({
    userId,
    imageUrl: input.imageUrl,
    weekNumber: input.weekNumber,
    feedback: input.feedback,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    const timestamp = now();

    // Convert empty feedback to null
    const feedback = validation.data.feedback
      ? validation.data.feedback
      : null;

    const newPhoto = await repo.create({
      userProfileId: validation.data.userId,
      imageUrl: validation.data.imageUrl,
      weekNumber: validation.data.weekNumber,
      uploadedAt: timestamp,
      feedback,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return { success: true, data: newPhoto };
  } catch (error) {
    console.error("Error creating progress photo:", error);
    return { success: false, error: "Failed to create progress photo" };
  }
}

/**
 * Update the feedback for a progress photo
 */
export async function updatePhotoFeedback(
  photoId: string,
  feedback: string,
  deps: ProgressPhotoDeps = defaultDeps
): Promise<Result<void>> {
  const { repo, now } = deps;

  // Validate input with Zod
  const validation = updateFeedbackSchema.safeParse({ photoId, feedback });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Check if photo exists
    const existing = await repo.findById(validation.data.photoId);
    if (!existing) {
      return { success: false, error: "Photo not found" };
    }

    const timestamp = now();

    // Convert empty string to null
    const updatedFeedback = validation.data.feedback || null;

    const updated = await repo.update(validation.data.photoId, {
      feedback: updatedFeedback,
      updatedAt: timestamp,
    });

    if (!updated) {
      return { success: false, error: "Photo not found" };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error updating photo feedback:", error);
    return { success: false, error: "Failed to update photo feedback" };
  }
}

/**
 * Delete a progress photo
 */
export async function deleteProgressPhoto(
  photoId: string,
  deps: ProgressPhotoDeps = defaultDeps
): Promise<Result<void>> {
  const { repo } = deps;

  // Validate input with Zod
  const validation = deletePhotoSchema.safeParse({ photoId });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    const deleted = await repo.deleteById(validation.data.photoId);

    if (!deleted) {
      return { success: false, error: "Photo not found" };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error deleting progress photo:", error);
    return { success: false, error: "Failed to delete progress photo" };
  }
}
