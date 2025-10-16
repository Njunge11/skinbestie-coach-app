"use server";

import { makeGoalsRepo } from "./goals.repo";
import type { Goal, NewGoal } from "./goals.repo.fake";

// Dependency injection for testing (follows TESTING.md)
export type GoalDeps = {
  repo: ReturnType<typeof makeGoalsRepo>;
  now: () => Date;
  validateId?: (id: string) => boolean;
};

// Default dependencies (production)
const defaultDeps: GoalDeps = {
  repo: makeGoalsRepo(),
  now: () => new Date(),
  validateId: isValidUUID,
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

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Get all goals for a user, ordered by priority
 */
export async function getGoals(
  userId: string,
  deps: GoalDeps = defaultDeps
): Promise<Result<Goal[]>> {
  const { repo, validateId = isValidUUID } = deps;

  // Validate userId
  if (!validateId(userId)) {
    return { success: false, error: "Invalid user ID" };
  }

  // Fetch goals from repo
  const goals = await repo.findByUserId(userId);

  return { success: true, data: goals };
}

/**
 * Create a new goal for a user
 */
export async function createGoal(
  userId: string,
  input: CreateGoalInput,
  deps: GoalDeps = defaultDeps
): Promise<Result<Goal>> {
  const { repo, now, validateId = isValidUUID } = deps;

  // Validate userId
  if (!validateId(userId)) {
    return { success: false, error: "Invalid data" };
  }

  // Validate input - all fields are required
  if (!input.name || input.name.trim() === "") {
    return { success: false, error: "Invalid data" };
  }
  if (!input.description || input.description.trim() === "") {
    return { success: false, error: "Invalid data" };
  }
  if (!input.timeframe || input.timeframe.trim() === "") {
    return { success: false, error: "Invalid data" };
  }

  // Get existing goals to determine order
  const existingGoals = await repo.findByUserId(userId);

  // Calculate order (max order + 1, or 0 if no goals)
  const order = existingGoals.length > 0
    ? Math.max(...existingGoals.map((g) => g.order)) + 1
    : 0;

  const timestamp = now();

  // Create goal
  const newGoal: NewGoal = {
    userProfileId: userId,
    name: input.name,
    description: input.description,
    timeframe: input.timeframe,
    complete: false,
    order,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const goal = await repo.create(newGoal);

  return { success: true, data: goal };
}

/**
 * Update an existing goal
 */
export async function updateGoal(
  goalId: string,
  updates: UpdateGoalInput,
  deps: GoalDeps = defaultDeps
): Promise<Result<void>> {
  const { repo, now, validateId = isValidUUID } = deps;

  // Validate goalId
  if (!validateId(goalId)) {
    return { success: false, error: "Invalid data" };
  }

  // Validate updates - required fields cannot be empty
  if (updates.name !== undefined && updates.name.trim() === "") {
    return { success: false, error: "Invalid data" };
  }
  if (updates.description !== undefined && updates.description.trim() === "") {
    return { success: false, error: "Invalid data" };
  }
  if (updates.timeframe !== undefined && updates.timeframe.trim() === "") {
    return { success: false, error: "Invalid data" };
  }

  // Build update data
  const updateData: Partial<Goal> = {
    updatedAt: now(),
  };

  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }

  if (updates.description !== undefined) {
    updateData.description = updates.description;
  }

  if (updates.timeframe !== undefined) {
    updateData.timeframe = updates.timeframe;
  }

  if (updates.complete !== undefined) {
    updateData.complete = updates.complete;
  }

  // Update goal
  const updatedGoal = await repo.update(goalId, updateData);

  if (!updatedGoal) {
    return { success: false, error: "Goal not found" };
  }

  return { success: true, data: undefined };
}

/**
 * Delete a goal
 */
export async function deleteGoal(
  goalId: string,
  deps: GoalDeps = defaultDeps
): Promise<Result<void>> {
  const { repo, validateId = isValidUUID } = deps;

  // Validate goalId
  if (!validateId(goalId)) {
    return { success: false, error: "Invalid data" };
  }

  // Delete goal
  const deletedGoal = await repo.deleteById(goalId);

  if (!deletedGoal) {
    return { success: false, error: "Goal not found" };
  }

  return { success: true, data: undefined };
}

/**
 * Reorder goals by updating their order values
 */
export async function reorderGoals(
  userId: string,
  reorderedGoalIds: string[],
  deps: GoalDeps = defaultDeps
): Promise<Result<void>> {
  const { repo, now, validateId = isValidUUID } = deps;

  // Validate userId
  if (!validateId(userId)) {
    return { success: false, error: "Invalid data" };
  }

  // Validate goalIds array
  if (!reorderedGoalIds || reorderedGoalIds.length === 0) {
    return { success: false, error: "Invalid data" };
  }

  const timestamp = now();

  // Build updates for each goal
  const updates = reorderedGoalIds.map((id, index) => ({
    id,
    data: {
      order: index,
      updatedAt: timestamp,
    },
  }));

  // Update all goals in batch
  await repo.updateMany(updates);

  return { success: true, data: undefined };
}
