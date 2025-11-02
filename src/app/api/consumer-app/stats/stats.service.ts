// Service layer for stats business logic
// Handles timezone conversions, percentage calculations, and orchestration

import { makeStatsRepo } from "./stats.repo";
import type { StatsRepo } from "./stats.repo";
import type { StatsResponse } from "./stats.types";
import { formatInTimeZone } from "date-fns-tz";
import { startOfWeek, format } from "date-fns";

// Result type pattern for error handling
export type StatsServiceResult =
  | { success: true; data: StatsResponse }
  | { success: false; error: string };

// Dependencies for testing
export type StatsServiceDeps = {
  repo?: StatsRepo;
  now?: () => Date;
};

export function makeStatsService(deps: StatsServiceDeps = {}) {
  const repo = deps.repo || makeStatsRepo();
  const now = deps.now || (() => new Date());

  return {
    /**
     * Get complete stats for consumer dashboard
     * Includes today's progress, current streak, and weekly compliance
     */
    async getStats(userId: string): Promise<StatsServiceResult> {
      try {
        // Step 1: Get user profile ID and timezone
        const userProfile = await repo.getUserProfileId(userId);

        if (!userProfile) {
          return { success: false, error: "User not found" };
        }

        // Use user's timezone, fallback to default
        const timezone = userProfile.timezone || "Europe/London";
        const currentTime = now();

        // Step 2: Calculate dates in user's timezone
        const todayDate = formatInTimeZone(currentTime, timezone, "yyyy-MM-dd");

        // Calculate start of calendar week (Monday - ISO 8601) in user's timezone
        // Parse today's date string as a timezone-naive date, then find start of week
        const todayAsDate = new Date(todayDate + "T12:00:00Z"); // Midday UTC to avoid TZ issues
        const weekStart = startOfWeek(todayAsDate, { weekStartsOn: 1 }); // 1 = Monday
        const weekStartDate = format(weekStart, "yyyy-MM-dd"); // Format without timezone conversion

        // Step 3: Run all queries in parallel for performance
        const [todayProgress, currentStreak, weeklyCompliance] =
          await Promise.all([
            repo.getTodayProgress(userProfile.id, todayDate),
            repo.getCurrentStreak(userProfile.id, todayDate),
            repo.getWeeklyCompliance(userProfile.id, weekStartDate, todayDate),
          ]);

        // Step 4: Calculate percentages
        const todayPercentage =
          todayProgress.total > 0
            ? Math.round((todayProgress.completed / todayProgress.total) * 100)
            : 0;

        const weeklyPercentage =
          weeklyCompliance.total > 0
            ? Math.round(
                (weeklyCompliance.completed / weeklyCompliance.total) * 100,
              )
            : 0;

        // Step 5: Format and return response
        return {
          success: true,
          data: {
            todayProgress: {
              completed: todayProgress.completed,
              total: todayProgress.total,
              percentage: todayPercentage,
            },
            currentStreak: {
              days: currentStreak,
            },
            weeklyCompliance: {
              percentage: weeklyPercentage,
              completed: weeklyCompliance.completed,
              total: weeklyCompliance.total,
            },
          },
        };
      } catch (error) {
        console.error("Error fetching stats:", error);
        return {
          success: false,
          error: "Failed to fetch user stats",
        };
      }
    },
  };
}
