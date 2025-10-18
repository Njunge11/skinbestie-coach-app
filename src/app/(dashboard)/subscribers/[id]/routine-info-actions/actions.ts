"use server";

import { z } from "zod";
import { makeRoutineRepo } from "./routine.repo";
import type { Routine, NewRoutine } from "./routine.repo.fake";
import { generateScheduledSteps } from "../compliance-actions/actions";
import { makeRoutineProductsRepo } from "../compliance-actions/routine-products.repo";

// Dependency injection for testing (follows TESTING.md)
export type RoutineDeps = {
  repo: ReturnType<typeof makeRoutineRepo>;
  now: () => Date;
};

// Default dependencies (production)
const defaultDeps: RoutineDeps = {
  repo: makeRoutineRepo(),
  now: () => new Date(),
};

// Result types
type SuccessResult<T> = { success: true; data: T };
type ErrorResult = { success: false; error: string };
type Result<T> = SuccessResult<T> | ErrorResult;

// Input types
export type CreateRoutineInput = {
  name: string;
  startDate: Date;
  endDate?: Date | null;
};

export type UpdateRoutineInput = {
  name?: string;
  startDate?: Date;
  endDate?: Date | null;
};

// Zod schemas for validation
const uuidSchema = z.string().uuid();
const requiredStringSchema = z.string().trim().min(1);
const dateSchema = z.coerce.date();

const createRoutineSchema = z.object({
  userId: uuidSchema,
  name: requiredStringSchema,
  startDate: dateSchema,
  endDate: dateSchema.nullable().optional(),
});

const updateRoutineSchema = z.object({
  routineId: uuidSchema,
  name: requiredStringSchema.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.nullable().optional(),
});

const deleteRoutineSchema = z.object({
  routineId: uuidSchema,
});

/**
 * Get the routine for a user (only one routine per user)
 */
export async function getRoutine(
  userId: string,
  deps: RoutineDeps = defaultDeps
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
  deps: RoutineDeps = defaultDeps
): Promise<Result<Routine>> {
  const { repo, now } = deps;

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

    const timestamp = now();

    // Create routine with validated data (already trimmed by Zod)
    const newRoutine: NewRoutine = {
      userProfileId: validation.data.userId,
      name: validation.data.name,
      startDate: validation.data.startDate,
      endDate: validation.data.endDate || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const routine = await repo.create(newRoutine);
    return { success: true, data: routine };
  } catch (error) {
    console.error("Error creating routine:", error);
    return { success: false, error: "Failed to create routine" };
  }
}

/**
 * Update an existing routine
 */
export async function updateRoutine(
  routineId: string,
  updates: UpdateRoutineInput,
  deps: RoutineDeps = defaultDeps
): Promise<Result<Routine>> {
  const { repo, now } = deps;

  // Validate input with Zod
  const validation = updateRoutineSchema.safeParse({
    routineId,
    ...updates,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Build update data with validated fields (already trimmed by Zod)
    const updateData: Partial<Routine> = {
      updatedAt: now(),
    };

    if (validation.data.name !== undefined) {
      updateData.name = validation.data.name;
    }

    if (validation.data.startDate !== undefined) {
      updateData.startDate = validation.data.startDate;
    }

    if (validation.data.endDate !== undefined) {
      updateData.endDate = validation.data.endDate;
    }

    // Update routine
    const updatedRoutine = await repo.update(validation.data.routineId, updateData);

    if (!updatedRoutine) {
      return { success: false, error: "Routine not found" };
    }

    return { success: true, data: updatedRoutine };
  } catch (error) {
    console.error("Error updating routine:", error);
    return { success: false, error: "Failed to update routine" };
  }
}

/**
 * Delete a routine (cascades to delete all routine products)
 */
export async function deleteRoutine(
  routineId: string,
  deps: RoutineDeps = defaultDeps
): Promise<Result<void>> {
  const { repo } = deps;

  // Validate input with Zod
  const validation = deleteRoutineSchema.safeParse({ routineId });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Delete routine
    const deletedRoutine = await repo.deleteById(validation.data.routineId);

    if (!deletedRoutine) {
      return { success: false, error: "Routine not found" };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error deleting routine:", error);
    return { success: false, error: "Failed to delete routine" };
  }
}

// Dependency injection for publishRoutine
export type PublishRoutineDeps = {
  routineRepo: ReturnType<typeof makeRoutineRepo>;
  productRepo: {
    findByRoutineId: (routineId: string) => Promise<Array<{ id: string }>>;
  };
  generateScheduledSteps: typeof generateScheduledSteps;
  now: () => Date;
};

// Default dependencies for publishRoutine (production)
const defaultPublishDeps: PublishRoutineDeps = {
  routineRepo: makeRoutineRepo(),
  productRepo: makeRoutineProductsRepo(),
  generateScheduledSteps,
  now: () => new Date(),
};

const publishRoutineSchema = z.object({
  routineId: uuidSchema,
});

/**
 * Publish a routine - updates status to published and generates scheduled steps
 */
export async function publishRoutine(
  routineId: string,
  deps: PublishRoutineDeps = defaultPublishDeps
): Promise<Result<Routine>> {
  const { routineRepo, productRepo, generateScheduledSteps, now } = deps;

  // Validate input with Zod
  const validation = publishRoutineSchema.safeParse({ routineId });

  if (!validation.success) {
    return { success: false, error: "Invalid routine ID" };
  }

  try {
    // Find the routine
    const routine = await routineRepo.findById(validation.data.routineId);

    if (!routine) {
      return { success: false, error: "Routine not found" };
    }

    // Check if already published
    if (routine.status === "published") {
      return { success: false, error: "Routine is already published" };
    }

    // Check if routine has products
    const products = await productRepo.findByRoutineId(validation.data.routineId);
    if (products.length === 0) {
      return { success: false, error: "Cannot publish routine without products" };
    }

    // Generate scheduled steps
    const generateResult = await generateScheduledSteps(validation.data.routineId);

    if (!generateResult.success) {
      return { success: false, error: generateResult.error };
    }

    // Update routine status to published
    const updatedRoutine = await routineRepo.update(validation.data.routineId, {
      status: "published",
      updatedAt: now(),
    });

    if (!updatedRoutine) {
      return { success: false, error: "Failed to update routine status" };
    }

    return { success: true, data: updatedRoutine };
  } catch (error) {
    console.error("Error publishing routine:", error);
    return { success: false, error: "Failed to publish routine" };
  }
}
