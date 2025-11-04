// Service layer for routine step completions
import { makeCompletionRepo, type CompletionRepo } from "./completion.repo";

// Service dependencies for testing
export type CompletionServiceDeps = {
  repo?: CompletionRepo;
};

// Service result types
type ServiceSuccess<T> = { success: true; data: T };
type ServiceError = { success: false; error: string };
type ServiceResult<T> = ServiceSuccess<T> | ServiceError;

// Inferred type from repo's returning() - represents a completion record
type CompletionRecord = Awaited<ReturnType<CompletionRepo["updateCompletion"]>>;
type CompletionRecordArray = Awaited<
  ReturnType<CompletionRepo["updateCompletionsByDate"]>
>;

export function makeCompletionService(deps: CompletionServiceDeps = {}) {
  const repo = deps.repo || makeCompletionRepo();

  return {
    /**
     * Update completion status for single step, multiple steps, or all steps for a date
     * @param params - Either { stepId, completed, userId }, { stepIds, completed, userId }, or { date, completed, userId }
     */
    async updateCompletion(params: {
      stepId?: string;
      stepIds?: string[];
      date?: string;
      completed: boolean;
      userId: string;
    }): Promise<ServiceResult<CompletionRecord | CompletionRecordArray>> {
      try {
        // Step 1: Get user profile ID from auth user ID
        const userProfile = await repo.getUserProfileId(params.userId);

        if (!userProfile) {
          return { success: false, error: "User not found" };
        }

        // Single step update
        if (params.stepId) {
          const completedAt = params.completed ? new Date() : undefined;

          const result = await repo.updateCompletion({
            stepId: params.stepId,
            completed: params.completed,
            userProfileId: userProfile.id,
            completedAt,
          });

          if (!result) {
            return {
              success: false,
              error: "Step not found or not authorized",
            };
          }

          return { success: true, data: result };
        }

        // Multi-step update by stepIds
        if (params.stepIds) {
          const completedAt = params.completed ? new Date() : undefined;

          const result = await repo.updateCompletionsByStepIds({
            stepIds: params.stepIds,
            completed: params.completed,
            userProfileId: userProfile.id,
            completedAt,
          });

          return { success: true, data: result };
        }

        // Multi-step update by date
        if (params.date) {
          const completedAt = params.completed ? new Date() : undefined;

          const result = await repo.updateCompletionsByDate({
            date: params.date,
            completed: params.completed,
            userProfileId: userProfile.id,
            completedAt,
          });

          return { success: true, data: result };
        }

        return {
          success: false,
          error: "Either stepId, stepIds, or date must be provided",
        };
      } catch (error) {
        console.error("Error updating completion:", error);
        return {
          success: false,
          error: params.stepId
            ? "Failed to update completion"
            : "Failed to update completions",
        };
      }
    },
  };
}

// Export type for testing
export type CompletionService = ReturnType<typeof makeCompletionService>;
