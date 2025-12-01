"use server";

import { db } from "@/lib/db";
import { makeRoutineRepo, type Routine, type NewRoutine } from "./routine.repo";
import { makeUserProfileRepo } from "../profile-header-actions/user-profile.repo";
import type { Result } from "@/lib/result";
import {
  type CreateRoutineInput,
  uuidSchema,
  createRoutineSchema,
} from "./validation";

// Default dependencies (production)
const defaultRoutineDeps = {
  repo: makeRoutineRepo(),
  userProfileRepo: makeUserProfileRepo(),
  db: db,
  now: () => new Date(),
};

// Dependency injection types (inferred from defaults)
export type RoutineDeps = typeof defaultRoutineDeps;

/**
 * Get the routine for a user (only one routine per user)
 */
export async function getRoutine(
  userId: string,
  deps: RoutineDeps = defaultRoutineDeps,
): Promise<Result<Routine | null>> {
  const { repo } = deps;

  // Validate userId with Zod
  const validation = uuidSchema.safeParse(userId);
  if (!validation.success) {
    return { success: false, error: "Invalid user ID" };
  }

  try {
    // Fetch routine from repo
    const routine = await repo.findByUserId(validation.data);
    return { success: true, data: routine };
  } catch (error) {
    console.error("Error fetching routine:", error);
    return { success: false, error: "Failed to fetch routine" };
  }
}

/**
 * Create a new routine for a user
 */
export async function createRoutine(
  userId: string,
  input: CreateRoutineInput,
  deps: RoutineDeps = defaultRoutineDeps,
): Promise<Result<Routine>> {
  const { repo } = deps;

  // Validate input with Zod
  const validation = createRoutineSchema.safeParse({
    userId,
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Check if user already has a routine
    const existingRoutine = await repo.findByUserId(validation.data.userId);
    if (existingRoutine) {
      return { success: false, error: "User already has a routine" };
    }

    // Create routine with validated data (already trimmed by Zod)
    const newRoutine: NewRoutine = {
      userProfileId: validation.data.userId,
      name: validation.data.name,
      startDate: validation.data.startDate,
      endDate: validation.data.endDate || null,
      status: "draft",
      savedAsTemplate: false,
    };

    const routine = await repo.create(newRoutine);
    return { success: true, data: routine };
  } catch (error) {
    console.error("Error creating routine:", error);
    return { success: false, error: "Failed to create routine" };
  }
}

/**
 * Delete a routine by ID
 *
 * Deletes the routine and resets user profile flags (productsReceived, routineStartDateSet).
 * Uses a transaction to ensure atomicity - either everything succeeds or everything rolls back.
 */
export async function deleteRoutine(
  routineId: string,
  deps: RoutineDeps = defaultRoutineDeps,
): Promise<Result<void>> {
  const { db } = deps;

  // Validate input with Zod
  const validation = uuidSchema.safeParse(routineId);

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Use transaction for atomicity
    await db.transaction(async (tx) => {
      // Create repos with transaction context
      const txRoutineRepo = makeRoutineRepo({ db: tx });
      const txUserProfileRepo = makeUserProfileRepo({ db: tx });

      // Get routine to extract userProfileId before deletion
      const routine = await txRoutineRepo.findById(validation.data);

      if (!routine) {
        throw new Error("Routine not found");
      }

      // Delete routine (cascade deletes products & completions automatically)
      await txRoutineRepo.deleteById(validation.data);

      // Reset user profile flags
      await txUserProfileRepo.update(routine.userProfileId, {
        productsReceived: false,
        routineStartDateSet: false,
      });
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error deleting routine:", error);

    if (error instanceof Error && error.message === "Routine not found") {
      return { success: false, error: "Routine not found" };
    }

    return { success: false, error: "Failed to delete routine" };
  }
}
