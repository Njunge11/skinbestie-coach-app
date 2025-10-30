"use server";

import { z } from "zod";
import { makeGoalsRepo } from "./goals.repo";
import { makeGoalsTemplateRepo } from "./goals-template.repo";
import type { Goal, NewGoal } from "./goals.repo";
import type { GoalsTemplate } from "./goals-template.repo";

// Import auth at the top level
import { auth } from "@/lib/auth";

// Get the current admin ID from NextAuth session
async function getCurrentAdminId(): Promise<string> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("No admin session found");
  }

  return session.user.id;
}

// Dependency injection for testing
export type GoalDeps = {
  repo: ReturnType<typeof makeGoalsRepo>;
  templateRepo: ReturnType<typeof makeGoalsTemplateRepo>;
  now: () => Date;
};

// Default dependencies (production)
const defaultDeps: GoalDeps = {
  repo: makeGoalsRepo(),
  templateRepo: makeGoalsTemplateRepo(),
  now: () => new Date(),
};

// Result types
type SuccessResult<T> = { success: true; data: T };
type ErrorResult = { success: false; error: string };
type Result<T> = SuccessResult<T> | ErrorResult;

// Input types - simplified to match schema
export type CreateGoalInput = {
  description: string;
  isPrimaryGoal?: boolean;
};

export type UpdateGoalInput = {
  description?: string;
  isPrimaryGoal?: boolean;
  complete?: boolean;
};

// Zod schemas for validation
const uuidSchema = z.string().uuid();
const requiredStringSchema = z.string().trim().min(1);

const createGoalSchema = z.object({
  userId: uuidSchema,
  description: requiredStringSchema,
  isPrimaryGoal: z.boolean().optional(),
});

const updateGoalSchema = z.object({
  goalId: uuidSchema,
  description: z.string().trim().min(1).optional(),
  isPrimaryGoal: z.boolean().optional(),
  complete: z.boolean().optional(),
});

const deleteGoalSchema = z.object({
  goalId: uuidSchema,
});

const reorderGoalsSchema = z.object({
  templateId: uuidSchema,
  goalIds: z.array(uuidSchema).min(1),
});

/**
 * Get template and goals for a user
 */
export async function getGoalsWithTemplate(
  userId: string,
  deps: GoalDeps = defaultDeps,
): Promise<Result<{ template: GoalsTemplate | null; goals: Goal[] }>> {
  const { repo, templateRepo } = deps;

  // Validate userId
  const validation = uuidSchema.safeParse(userId);
  if (!validation.success) {
    return { success: false, error: "Invalid user ID" };
  }

  try {
    // Get template for user
    const template = await templateRepo.findByUserId(validation.data);

    // If no template, return empty goals
    if (!template) {
      return { success: true, data: { template: null, goals: [] } };
    }

    // Get goals for template
    const goals = await repo.findByTemplateId(template.id);

    return { success: true, data: { template, goals } };
  } catch (error) {
    console.error("Error fetching goals:", error);
    return { success: false, error: "Failed to fetch goals" };
  }
}

/**
 * Create a new goal for a user (creates template if needed)
 */
export async function createGoal(
  userId: string,
  input: CreateGoalInput,
  deps: GoalDeps = defaultDeps,
): Promise<Result<Goal>> {
  const { repo, templateRepo } = deps;

  // Validate input
  const validation = createGoalSchema.safeParse({
    userId,
    description: input.description,
    isPrimaryGoal: input.isPrimaryGoal,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Get or create template
    let template = await templateRepo.findByUserId(validation.data.userId);

    if (!template) {
      // Create template on first goal
      const adminId = await getCurrentAdminId();
      template = await templateRepo.create({
        userId: validation.data.userId,
        status: "unpublished", // Start unpublished
        createdBy: adminId,
        updatedBy: adminId,
      });
    }

    // If marking as primary, unmark all other primary goals for this template
    if (validation.data.isPrimaryGoal) {
      await repo.unmarkAllPrimary(template.id);
    }

    // Get existing goals to determine order
    const existingGoals = await repo.findByTemplateId(template.id);
    const order =
      existingGoals.length > 0
        ? Math.max(...existingGoals.map((g) => g.order)) + 1
        : 0;

    // Create goal
    const newGoal: NewGoal = {
      templateId: template.id,
      description: validation.data.description,
      isPrimaryGoal: validation.data.isPrimaryGoal ?? false,
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
  deps: GoalDeps = defaultDeps,
): Promise<Result<void>> {
  const { repo, now } = deps;

  // Validate input
  const validation = updateGoalSchema.safeParse({
    goalId,
    ...updates,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // If marking as primary, need to get the goal's template first
    if (validation.data.isPrimaryGoal) {
      const goal = await repo.findById(validation.data.goalId);
      if (!goal) {
        return { success: false, error: "Goal not found" };
      }
      // Unmark all other primary goals for this template
      await repo.unmarkAllPrimary(goal.templateId);
    }

    // Build update data
    const updateData: Partial<Goal> = {
      updatedAt: now(),
    };

    if (validation.data.description !== undefined) {
      updateData.description = validation.data.description;
    }

    if (validation.data.isPrimaryGoal !== undefined) {
      updateData.isPrimaryGoal = validation.data.isPrimaryGoal;
    }

    if (validation.data.complete !== undefined) {
      updateData.complete = validation.data.complete;
      updateData.completedAt = validation.data.complete ? now() : null;
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
 * Toggle goal completion
 */
export async function toggleGoalComplete(
  goalId: string,
  deps: GoalDeps = defaultDeps,
): Promise<Result<void>> {
  const { repo } = deps;

  // Validate input
  const validation = uuidSchema.safeParse(goalId);
  if (!validation.success) {
    return { success: false, error: "Invalid goal ID" };
  }

  try {
    // First get the goal to know current state
    // This is a simplification - you might want to add a findById method
    const updatedGoal = await repo.toggleComplete(validation.data, true);

    if (!updatedGoal) {
      return { success: false, error: "Goal not found" };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error toggling goal:", error);
    return { success: false, error: "Failed to toggle goal" };
  }
}

/**
 * Delete a goal
 */
export async function deleteGoal(
  goalId: string,
  deps: GoalDeps = defaultDeps,
): Promise<Result<void>> {
  const { repo } = deps;

  // Validate input
  const validation = deleteGoalSchema.safeParse({ goalId });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
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
  templateId: string,
  reorderedGoalIds: string[],
  deps: GoalDeps = defaultDeps,
): Promise<Result<void>> {
  const { repo, now } = deps;

  // Validate input
  const validation = reorderGoalsSchema.safeParse({
    templateId,
    goalIds: reorderedGoalIds,
  });

  if (!validation.success) {
    console.error("❌ Validation failed:", validation.error);
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
    console.error("❌ Error reordering goals:", error);
    console.error("Error type:", typeof error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: "Failed to reorder goals" };
  }
}

/**
 * Toggle template publish status
 */
export async function toggleTemplatePublish(
  userId: string,
  deps: GoalDeps = defaultDeps,
): Promise<Result<GoalsTemplate>> {
  const { templateRepo } = deps;

  // Validate input
  const validation = uuidSchema.safeParse(userId);
  if (!validation.success) {
    return { success: false, error: "Invalid user ID" };
  }

  try {
    // Get current template
    const template = await templateRepo.findByUserId(validation.data);

    if (!template) {
      return { success: false, error: "No goals template found" };
    }

    // Toggle status
    const newStatus =
      template.status === "published" ? "unpublished" : "published";
    const adminId = await getCurrentAdminId();

    const updated = await templateRepo.updateStatus(
      template.id,
      newStatus,
      adminId,
    );

    if (!updated) {
      return { success: false, error: "Failed to update template" };
    }

    return { success: true, data: updated };
  } catch (error) {
    console.error("Error toggling template publish:", error);
    return { success: false, error: "Failed to toggle publish status" };
  }
}
