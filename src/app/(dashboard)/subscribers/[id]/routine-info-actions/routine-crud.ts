"use server";

import { db } from "@/lib/db";
import { makeRoutineRepo, type Routine, type NewRoutine } from "./routine.repo";
import type { Result } from "@/lib/result";
import {
  type CreateRoutineInput,
  uuidSchema,
  createRoutineSchema,
} from "./validation";

// Default dependencies (production)
const defaultRoutineDeps = {
  repo: makeRoutineRepo(),
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
 */
export async function deleteRoutine(
  routineId: string,
  deps: RoutineDeps = defaultRoutineDeps,
): Promise<Result<void>> {
  const { repo } = deps;

  // Validate input with Zod
  const validation = uuidSchema.safeParse(routineId);

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Delete routine
    const deletedRoutine = await repo.deleteById(validation.data);

    if (!deletedRoutine) {
      return { success: false, error: "Routine not found" };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error deleting routine:", error);
    return { success: false, error: "Failed to delete routine" };
  }
}
