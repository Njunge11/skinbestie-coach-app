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
        console.log(
          "[CompletionService] Looking up userProfileId for userId:",
          params.userId,
        );
        const userProfile = await repo.getUserProfileId(params.userId);

        if (!userProfile) {
          console.log(
            "[CompletionService] User profile not found for userId:",
            params.userId,
          );
          return { success: false, error: "User not found" };
        }

        console.log("[CompletionService] Found userProfileId:", userProfile.id);

        // Single step update
        if (params.stepId) {
          console.log("[CompletionService] Single step update requested:", {
            stepId: params.stepId,
            completed: params.completed,
            userId: params.userId,
            userProfileId: userProfile.id,
          });

          const completedAt = params.completed ? new Date() : undefined;

          console.log(
            "[CompletionService] Calling repo.updateCompletion with:",
            {
              stepId: params.stepId,
              completed: params.completed,
              userProfileId: userProfile.id,
              completedAt: completedAt?.toISOString(),
            },
          );

          const result = await repo.updateCompletion({
            stepId: params.stepId,
            completed: params.completed,
            userProfileId: userProfile.id,
            completedAt,
          });

          if (!result) {
            console.log(
              "[CompletionService] Step not found or not authorized:",
              {
                stepId: params.stepId,
                userProfileId: userProfile.id,
              },
            );
            return {
              success: false,
              error: "Step not found or not authorized",
            };
          }

          console.log("[CompletionService] Update successful:", {
            stepId: result.id,
            status: result.status,
            completedAt: result.completedAt?.toISOString(),
            onTimeDeadline: result.onTimeDeadline?.toISOString(),
            gracePeriodEnd: result.gracePeriodEnd?.toISOString(),
          });

          return { success: true, data: result };
        }

        // Multi-step update by stepIds
        if (params.stepIds) {
          console.log(
            "[CompletionService] Multi-step update by stepIds requested:",
            {
              stepIds: params.stepIds,
              completed: params.completed,
              userId: params.userId,
              userProfileId: userProfile.id,
            },
          );

          const completedAt = params.completed ? new Date() : undefined;

          const result = await repo.updateCompletionsByStepIds({
            stepIds: params.stepIds,
            completed: params.completed,
            userProfileId: userProfile.id,
            completedAt,
          });

          console.log("[CompletionService] Multi-step update complete:", {
            updatedCount: result.length,
          });

          return { success: true, data: result };
        }

        // Multi-step update by date
        if (params.date) {
          console.log(
            "[CompletionService] Multi-step update by date requested:",
            {
              date: params.date,
              completed: params.completed,
              userId: params.userId,
              userProfileId: userProfile.id,
            },
          );

          const completedAt = params.completed ? new Date() : undefined;

          const result = await repo.updateCompletionsByDate({
            date: params.date,
            completed: params.completed,
            userProfileId: userProfile.id,
            completedAt,
          });

          console.log("[CompletionService] Multi-step update complete:", {
            updatedCount: result.length,
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
