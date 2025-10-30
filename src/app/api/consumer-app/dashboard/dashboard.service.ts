// Service layer for dashboard business logic
// Handles data transformation, progress calculation, and orchestration

import { makeDashboardRepo } from "./dashboard.repo";
import type { DashboardResponse } from "./dashboard.types";

export type DashboardServiceDeps = {
  repo?: ReturnType<typeof makeDashboardRepo>;
  now?: () => Date;
};

export type DashboardServiceResult =
  | { success: true; data: DashboardResponse }
  | { success: false; error: string };

export function makeDashboardService(deps: DashboardServiceDeps = {}) {
  const repo = deps.repo || makeDashboardRepo();
  const now = deps.now || (() => new Date());

  return {
    /**
     * Get complete dashboard data for consumer app
     * Includes setup progress, goals, and today's routine
     */
    async getConsumerDashboard(
      userId: string,
    ): Promise<DashboardServiceResult> {
      try {
        // Validate input
        if (!userId) {
          return { success: false, error: "User ID is required" };
        }

        // Get user dashboard data with setup status
        const userData = await repo.getUserDashboardData(userId);

        if (!userData) {
          return { success: false, error: "User not found" };
        }

        // Execute parallel queries for goals, today's routine, and routine metadata
        const [goals, todayRoutine, routine] = await Promise.all([
          repo.getPublishedGoals(userId),
          repo.getTodayRoutineSteps(userId, now()),
          repo.getRoutine(userId),
        ]);

        // Calculate setup progress
        const steps = {
          hasCompletedSkinTest: userData.hasCompletedSkinTest ?? false,
          hasPublishedGoals: userData.goalsTemplateStatus === "published",
          hasPublishedRoutine: userData.routineStatus === "published",
          hasCompletedBooking: userData.hasCompletedBooking ?? false,
        };

        const completed = Object.values(steps).filter(Boolean).length;
        const total = 4;
        const percentage = Math.round((completed / total) * 100);

        // Format response
        // For routine: if published routine exists, return array (even if empty), else null
        // For goals: if published template exists, return array (even if empty), else null
        const response: DashboardResponse = {
          user: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            nickname: userData.nickname,
            skinType: userData.skinType,
          },
          setupProgress: {
            percentage,
            completed,
            total,
            steps,
          },
          todayRoutine:
            userData.routineStatus === "published" ? todayRoutine : null,
          routine: routine,
          goals: userData.goalsTemplateStatus === "published" ? goals : null,
          goalsAcknowledgedByClient:
            userData.goalsAcknowledgedByClient ?? false,
        };

        return { success: true, data: response };
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return {
          success: false,
          error: "Failed to retrieve dashboard data",
        };
      }
    },
  };
}
