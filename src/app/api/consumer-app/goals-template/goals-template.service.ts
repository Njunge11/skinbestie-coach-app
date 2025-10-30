// Service layer for goals template business logic
import { makeGoalsTemplateRepo } from "./goals-template.repo";
import type {
  GoalsTemplateData,
  GoalsTemplateUpdateData,
} from "./goals-template.repo";

export type GoalsTemplateServiceDeps = {
  repo?: ReturnType<typeof makeGoalsTemplateRepo>;
};

export type GoalsTemplateServiceResult =
  | { success: true; data: GoalsTemplateData }
  | { success: false; error: string };

export function makeGoalsTemplateService(deps: GoalsTemplateServiceDeps = {}) {
  const repo = deps.repo || makeGoalsTemplateRepo({});

  return {
    /**
     * Update goals template with partial data
     */
    async updateGoalsTemplate(
      userId: string,
      updates: GoalsTemplateUpdateData,
    ): Promise<GoalsTemplateServiceResult> {
      try {
        // Validate input
        if (!userId) {
          return { success: false, error: "User ID is required" };
        }

        // Get user profile ID from auth user ID
        const userProfileId = await repo.getUserProfileIdByUserId(userId);
        if (!userProfileId) {
          return { success: false, error: "User not found" };
        }

        // Check if goals template exists
        const existingTemplate =
          await repo.getGoalsTemplateByUserProfileId(userProfileId);
        if (!existingTemplate) {
          return { success: false, error: "Goals template not found" };
        }

        // Update goals template
        const updatedTemplate = await repo.updateGoalsTemplate(
          userProfileId,
          updates,
        );
        if (!updatedTemplate) {
          return { success: false, error: "Failed to update goals template" };
        }

        return { success: true, data: updatedTemplate };
      } catch (error) {
        console.error("Error updating goals template:", error);
        return {
          success: false,
          error: "Failed to update goals template",
        };
      }
    },
  };
}
