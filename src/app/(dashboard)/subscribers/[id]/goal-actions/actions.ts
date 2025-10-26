"use server";

import { z } from "zod";
import { makeGoalsRepo } from "./goals.repo";
import type { Goal, NewGoal } from "./goals.repo";

// Dependency injection for testing (follows TESTING.md)
export type GoalDeps = {
  repo: ReturnType<typeof makeGoalsRepo>;
  now: () => Date;
};

// Default dependencies (production)
const defaultDeps: GoalDeps = {
  repo: makeGoalsRepo(),
  now: () => new Date(),
};

// Result types
type SuccessResult<T> = { success: true; data: T };
type ErrorResult = { success: false; error: string };
type Result<T> = SuccessResult<T> | ErrorResult;

// Input types
export type CreateGoalInput = {
  name: string;
  description: string;
  timeframe: string;
};

export type UpdateGoalInput = {
  name?: string;
  description?: string;
  timeframe?: string;
  complete?: boolean;
};

// Zod schemas for validation
const uuidSchema = z.string().uuid();
const requiredStringSchema = z.string().trim().min(1);

const createGoalSchema = z.object({
  userId: uuidSchema,
  name: requiredStringSchema,
  description: requiredStringSchema,
  timeframe: requiredStringSchema,
});

const updateGoalSchema = z.object({
  goalId: uuidSchema,
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  timeframe: z.string().trim().min(1).optional(),
  complete: z.boolean().optional(),
});

const deleteGoalSchema = z.object({
  goalId: uuidSchema,
});

const reorderGoalsSchema = z.object({
  userId: uuidSchema,
  goalIds: z.array(uuidSchema).min(1),
});

/**
 * Get all goals for a user, ordered by priority
 */
export async function getGoals(
  userId: string,
  deps: GoalDeps = defaultDeps
): Promise<Result<Goal[]>> {
  const { repo } = deps;


  // Validate userId with Zod
  const validation = uuidSchema.safeParse(userId);
  if (!validation.success) {
    return { success: false, error: "Invalid user ID" };
  }

  try {
    // Fetch goals from repo
    const goals = await repo.findByUserId(validation.data);
    return { success: true, data: goals };
  } catch (error) {
    console.error("Error fetching goals:", error);
    return { success: false, error: "Failed to fetch goals" };
  }
}

/**
 * Create a new goal for a user
 */
export async function createGoal(
  userId: string,
  input: CreateGoalInput,
  deps: GoalDeps = defaultDeps
): Promise<Result<Goal>> {
  const { repo, now } = deps;

  // Validate input with Zod
  const validation = createGoalSchema.safeParse({
    userId,
    name: input.name,
    description: input.description,
    timeframe: input.timeframe,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Get existing goals to determine order
    const existingGoals = await repo.findByUserId(validation.data.userId);

    // Calculate order (max order + 1, or 0 if no goals)
    const order = existingGoals.length > 0
      ? Math.max(...existingGoals.map((g) => g.order)) + 1
      : 0;

    // Create goal with validated data (already trimmed by Zod)
    const newGoal: NewGoal = {
      userProfileId: validation.data.userId,
      name: validation.data.name,
      description: validation.data.description,
      timeframe: validation.data.timeframe,
      complete: false,
      order,
    };

    const goal = await repo.create(newGoal);
    return { success: true, data: goal };
  } catch (error) {
    console.error("Error creating goal:", error);
    return { success: false, error: "Failed to create goal" };
  }
}

/**
 * Update an existing goal
 */
export async function updateGoal(
  goalId: string,
  updates: UpdateGoalInput,
  deps: GoalDeps = defaultDeps
): Promise<Result<void>> {
  const { repo, now } = deps;

  // Validate input with Zod
  const validation = updateGoalSchema.safeParse({
    goalId,
    ...updates,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Build update data with validated fields (already trimmed by Zod)
    const updateData: Partial<Goal> = {
      updatedAt: now(),
    };

    if (validation.data.name !== undefined) {
      updateData.name = validation.data.name;
    }

    if (validation.data.description !== undefined) {
      updateData.description = validation.data.description;
    }

    if (validation.data.timeframe !== undefined) {
      updateData.timeframe = validation.data.timeframe;
    }

    if (validation.data.complete !== undefined) {
      updateData.complete = validation.data.complete;
    }

    // Update goal
    const updatedGoal = await repo.update(validation.data.goalId, updateData);

    if (!updatedGoal) {
      return { success: false, error: "Goal not found" };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error updating goal:", error);
    return { success: false, error: "Failed to update goal" };
  }
}

/**
 * Delete a goal
 */
export async function deleteGoal(
  goalId: string,
  deps: GoalDeps = defaultDeps
): Promise<Result<void>> {
  const { repo } = deps;

  // Validate input with Zod
  const validation = deleteGoalSchema.safeParse({ goalId });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Delete goal
    const deletedGoal = await repo.deleteById(validation.data.goalId);

    if (!deletedGoal) {
      return { success: false, error: "Goal not found" };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error deleting goal:", error);
    return { success: false, error: "Failed to delete goal" };
  }
}

/**
 * Reorder goals by updating their order values
 */
export async function reorderGoals(
  userId: string,
  reorderedGoalIds: string[],
  deps: GoalDeps = defaultDeps
): Promise<Result<void>> {
  const { repo, now } = deps;

  // Validate input with Zod
  const validation = reorderGoalsSchema.safeParse({
    userId,
    goalIds: reorderedGoalIds,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    const timestamp = now();

    // Build updates for each goal
    const updates = validation.data.goalIds.map((id, index) => ({
      id,
      data: {
        order: index,
        updatedAt: timestamp,
      },
    }));

    // Update all goals in batch
    await repo.updateMany(updates);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error reordering goals:", error);
    return { success: false, error: "Failed to reorder goals" };
  }
}
