"use server";

import { z } from "zod";
import { makeRoutineRepo, type Routine, type NewRoutine } from "./routine.repo";
import { makeRoutineProductsRepo } from "../compliance-actions/routine-products.repo";
import { db, skincareRoutines, routineStepCompletions } from "@/lib/db";
import { makeUserProfileRepo } from "../compliance-actions/user-profile.repo";
import { calculateDeadlines, shouldGenerateForDate } from "@/lib/compliance-utils";
import { addMonths, addDays } from "date-fns";
import { eq } from "drizzle-orm";

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
    findByRoutineId: (routineId: string) => Promise<Array<{
      id: string;
      frequency: string;
      days?: string[];
      timeOfDay: "morning" | "evening";
    }>>;
  };
  now: () => Date;
};

// Default dependencies for publishRoutine (production)
const defaultPublishDeps: PublishRoutineDeps = {
  routineRepo: makeRoutineRepo(),
  productRepo: makeRoutineProductsRepo(),
  now: () => new Date(),
};

const publishRoutineSchema = z.object({
  routineId: uuidSchema,
});

/**
 * Publish a routine - updates status to published and generates scheduled steps
 *
 * TRANSACTION FIX: Previously this had two separate operations:
 * 1. generateScheduledSteps() - using repo (global db)
 * 2. routineRepo.update() - using repo (global db)
 *
 * This caused data integrity issues if step 2 failed - scheduled steps would exist
 * but routine would stay "draft".
 *
 * FIX: Inline step generation SQL into a single transaction with status update.
 */
export async function publishRoutine(
  routineId: string,
  deps: PublishRoutineDeps = defaultPublishDeps
): Promise<Result<Routine>> {
  const { routineRepo, productRepo, now } = deps;

  // Validate input with Zod
  const validation = publishRoutineSchema.safeParse({ routineId });

  if (!validation.success) {
    return { success: false, error: "Invalid routine ID" };
  }

  try {
    // Fetch all required data BEFORE transaction (read-only operations)
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

    // Fetch user for timezone
    const userRepo = makeUserProfileRepo();
    const user = await userRepo.findById(routine.userProfileId);
    if (!user) {
      return { success: false, error: "User profile not found" };
    }

    // Calculate scheduled steps data BEFORE transaction
    const endDate = routine.endDate ?? addMonths(routine.startDate, 6);
    const completionsToCreate: Array<{
      routineProductId: string;
      userProfileId: string;
      scheduledDate: Date;
      scheduledTimeOfDay: "morning" | "evening";
      onTimeDeadline: Date;
      gracePeriodEnd: Date;
      completedAt: null;
      status: "pending";
    }> = [];
    let currentDate = new Date(routine.startDate);

    while (currentDate <= endDate) {
      for (const product of products) {
        if (shouldGenerateForDate(product, currentDate)) {
          const { onTimeDeadline, gracePeriodEnd } = calculateDeadlines(
            currentDate,
            product.timeOfDay,
            user.timezone
          );

          completionsToCreate.push({
            routineProductId: product.id,
            userProfileId: routine.userProfileId,
            scheduledDate: new Date(currentDate),
            scheduledTimeOfDay: product.timeOfDay,
            onTimeDeadline,
            gracePeriodEnd,
            completedAt: null,
            status: "pending" as const,
          });
        }
      }
      currentDate = addDays(currentDate, 1);
    }

    // CRITICAL: Both status update AND step creation in ONE transaction
    const updatedRoutine = await db.transaction(async (tx) => {
      // Update routine status using tx
      const [updated] = await tx
        .update(skincareRoutines)
        .set({
          status: "published",
          updatedAt: now(),
        })
        .where(eq(skincareRoutines.id, validation.data.routineId))
        .returning();

      if (!updated) {
        throw new Error("Failed to update routine status");
      }

      // Insert all scheduled steps using tx
      if (completionsToCreate.length > 0) {
        await tx.insert(routineStepCompletions).values(completionsToCreate);
      }

      return updated as Routine;
    });

    return { success: true, data: updatedRoutine };
  } catch (error) {
    console.error("Error publishing routine:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to publish routine";
    return { success: false, error: errorMessage };
  }
}
