// Service layer for consumer app goals business logic
import { z } from "zod";
import { makeGoalsRepo } from "@/app/(dashboard)/subscribers/[id]/goal-actions/goals.repo";
import { makeGoalsTemplateRepo as makeAdminGoalsTemplateRepo } from "@/app/(dashboard)/subscribers/[id]/goal-actions/goals-template.repo";
import { makeGoalsTemplateRepo as makeConsumerGoalsTemplateRepo } from "../goals-template/goals-template.repo";
import type {
  Goal,
  NewGoal,
} from "@/app/(dashboard)/subscribers/[id]/goal-actions/goals.repo";

// Validation schemas
const uuidSchema = z.string().uuid();
const createGoalSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  timeline: z.string().optional(),
  isPrimaryGoal: z.boolean().optional(),
});

const updateGoalSchema = z.object({
  description: z.string().trim().min(1, "Description is required").optional(),
  timeline: z.string().optional(),
  isPrimaryGoal: z.boolean().optional(),
  complete: z.boolean().optional(),
});

const reorderGoalsSchema = z.object({
  goalIds: z
    .array(z.string().uuid("Invalid goal ID format"))
    .min(1, "At least one goal ID is required"),
});

// Result types
type SuccessResult<T> = { success: true; data: T };
type ErrorResult = { success: false; error: string };
type Result<T> = SuccessResult<T> | ErrorResult;

// Input types
export type CreateGoalInput = {
  description: string;
  timeline?: string;
  isPrimaryGoal?: boolean;
};

export type UpdateGoalInput = {
  description?: string;
  timeline?: string;
  isPrimaryGoal?: boolean;
  complete?: boolean;
};

// Dependency injection types
export type GoalsServiceDeps = {
  goalsRepo?: ReturnType<typeof makeGoalsRepo>;
  templateRepo?: ReturnType<typeof makeAdminGoalsTemplateRepo>;
  userProfileRepo?: {
    getUserProfileIdByUserId: (userId: string) => Promise<string | null>;
  };
  now?: () => Date;
};

// Default dependencies (production)
const defaultDeps: Required<GoalsServiceDeps> = {
  goalsRepo: makeGoalsRepo(),
  templateRepo: makeAdminGoalsTemplateRepo(),
  userProfileRepo: {
    getUserProfileIdByUserId: async (userId: string) => {
      // Use consumer app repo which has this method
      const repo = makeConsumerGoalsTemplateRepo();
      return await repo.getUserProfileIdByUserId(userId);
    },
  },
  now: () => new Date(),
};

export function makeGoalsService(deps: GoalsServiceDeps = {}) {
  const {
    goalsRepo = defaultDeps.goalsRepo,
    templateRepo = defaultDeps.templateRepo,
    userProfileRepo = defaultDeps.userProfileRepo,
    now = defaultDeps.now,
  } = deps;

  return {
    /**
     * Create a new goal for a user
     */
    async createGoal(
      userId: string,
      input: CreateGoalInput,
    ): Promise<Result<Goal>> {
      try {
        // Validate userId
        const userIdValidation = uuidSchema.safeParse(userId);
        if (!userIdValidation.success) {
          return { success: false, error: "Invalid user ID" };
        }

        // Validate input
        const inputValidation = createGoalSchema.safeParse(input);
        if (!inputValidation.success) {
          return { success: false, error: "Invalid data" };
        }

        // Get user profile ID from auth user ID
        const userProfileId =
          await userProfileRepo.getUserProfileIdByUserId(userId);
        if (!userProfileId) {
          return { success: false, error: "User not found" };
        }

        // Get template for user
        const template = await templateRepo.findByUserId(userProfileId);
        if (!template) {
          return { success: false, error: "Goals template not found" };
        }

        // If marking as primary, unmark all other primary goals for this template
        if (inputValidation.data.isPrimaryGoal) {
          await goalsRepo.unmarkAllPrimary(template.id);
        }

        // Get existing goals to determine order
        const existingGoals = await goalsRepo.findByTemplateId(template.id);
        const order =
          existingGoals.length > 0
            ? Math.max(...existingGoals.map((g) => g.order)) + 1
            : 0;

        // Create goal
        const newGoal: NewGoal = {
          templateId: template.id,
          description: inputValidation.data.description,
          timeline: inputValidation.data.timeline ?? null,
          isPrimaryGoal: inputValidation.data.isPrimaryGoal ?? false,
          complete: false,
          order,
        };

        const goal = await goalsRepo.create(newGoal);
        return { success: true, data: goal };
      } catch (error) {
        console.error("Error creating goal:", error);
        return { success: false, error: "Failed to create goal" };
      }
    },

    /**
     * Update an existing goal
     */
    async updateGoal(
      goalId: string,
      updates: UpdateGoalInput,
    ): Promise<Result<void>> {
      try {
        // Validate goalId
        const goalIdValidation = uuidSchema.safeParse(goalId);
        if (!goalIdValidation.success) {
          return { success: false, error: "Invalid goal ID" };
        }

        // Validate updates
        const updatesValidation = updateGoalSchema.safeParse(updates);
        if (!updatesValidation.success) {
          return { success: false, error: "Invalid data" };
        }

        // Get existing goal
        const existingGoal = await goalsRepo.findById(goalIdValidation.data);
        if (!existingGoal) {
          return { success: false, error: "Goal not found" };
        }

        // If marking as primary, unmark all other primary goals for this template
        if (updatesValidation.data.isPrimaryGoal) {
          await goalsRepo.unmarkAllPrimary(existingGoal.templateId);
        }

        // Build update data
        const updateData: Partial<Goal> = {
          updatedAt: now(),
        };

        if (updatesValidation.data.description !== undefined) {
          updateData.description = updatesValidation.data.description;
        }

        if (updatesValidation.data.timeline !== undefined) {
          updateData.timeline = updatesValidation.data.timeline ?? null;
        }

        if (updatesValidation.data.isPrimaryGoal !== undefined) {
          updateData.isPrimaryGoal = updatesValidation.data.isPrimaryGoal;
        }

        if (updatesValidation.data.complete !== undefined) {
          updateData.complete = updatesValidation.data.complete;
          updateData.completedAt = updatesValidation.data.complete
            ? now()
            : null;
        }

        // Update goal
        const updatedGoal = await goalsRepo.update(
          goalIdValidation.data,
          updateData,
        );

        if (!updatedGoal) {
          return { success: false, error: "Goal not found" };
        }

        return { success: true, data: undefined };
      } catch (error) {
        console.error("Error updating goal:", error);
        return { success: false, error: "Failed to update goal" };
      }
    },

    /**
     * Delete a goal
     */
    async deleteGoal(goalId: string): Promise<Result<void>> {
      try {
        // Validate goalId
        const goalIdValidation = uuidSchema.safeParse(goalId);
        if (!goalIdValidation.success) {
          return { success: false, error: "Invalid goal ID" };
        }

        // Delete goal
        const deletedGoal = await goalsRepo.deleteById(goalIdValidation.data);

        if (!deletedGoal) {
          return { success: false, error: "Goal not found" };
        }

        return { success: true, data: undefined };
      } catch (error) {
        console.error("Error deleting goal:", error);
        return { success: false, error: "Failed to delete goal" };
      }
    },

    /**
     * Reorder goals for a user
     */
    async reorderGoals(
      userId: string,
      goalIds: string[],
    ): Promise<Result<void>> {
      try {
        // Validate userId
        const userIdValidation = uuidSchema.safeParse(userId);
        if (!userIdValidation.success) {
          return { success: false, error: "Invalid user ID" };
        }

        // Validate goalIds
        const validation = reorderGoalsSchema.safeParse({ goalIds });
        if (!validation.success) {
          return { success: false, error: "Invalid data" };
        }

        // Get user profile ID from auth user ID
        const userProfileId =
          await userProfileRepo.getUserProfileIdByUserId(userId);
        if (!userProfileId) {
          return { success: false, error: "User not found" };
        }

        // Get template for user
        const template = await templateRepo.findByUserId(userProfileId);
        if (!template) {
          return { success: false, error: "Goals template not found" };
        }

        // Get existing goals to verify all IDs are valid
        const existingGoals = await goalsRepo.findByTemplateId(template.id);
        const existingGoalIds = new Set(existingGoals.map((g) => g.id));

        // Verify all goalIds exist
        for (const goalId of validation.data.goalIds) {
          if (!existingGoalIds.has(goalId)) {
            return { success: false, error: "Invalid goal IDs" };
          }
        }

        // Build update data with new order
        const timestamp = now();
        const updates = validation.data.goalIds.map((goalId, index) => ({
          id: goalId,
          data: {
            order: index,
            updatedAt: timestamp,
          },
        }));

        // Update all goals with new order
        await goalsRepo.updateMany(updates);

        return { success: true, data: undefined };
      } catch (error) {
        console.error("Error reordering goals:", error);
        return { success: false, error: "Failed to reorder goals" };
      }
    },

    /**
     * Acknowledge goals (set goalsAcknowledgedByClient flag)
     */
    async acknowledgeGoals(
      userId: string,
      acknowledged: boolean,
    ): Promise<Result<void>> {
      try {
        // Validate userId
        const userIdValidation = uuidSchema.safeParse(userId);
        if (!userIdValidation.success) {
          return { success: false, error: "Invalid user ID" };
        }

        // Get user profile ID from auth user ID
        const userProfileId =
          await userProfileRepo.getUserProfileIdByUserId(userId);
        if (!userProfileId) {
          return { success: false, error: "User not found" };
        }

        // Get template for user
        const template = await templateRepo.findByUserId(userProfileId);
        if (!template) {
          return { success: false, error: "Goals template not found" };
        }

        // Update acknowledgment
        await templateRepo.updateAcknowledgment(
          template.id,
          acknowledged,
          now(),
        );

        return { success: true, data: undefined };
      } catch (error) {
        console.error("Error acknowledging goals:", error);
        return { success: false, error: "Failed to acknowledge goals" };
      }
    },
  };
}
