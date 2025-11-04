// Repository layer for stats data access
// Uses optimized queries with aggregations for minimal database round trips

import { eq, and, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

// For dependency injection in tests
// Accept any Drizzle database instance (PostgresJs or PgLite)
export type StatsRepoDeps = {
  db?:
    | typeof db
    | PostgresJsDatabase<typeof schema>
    | PgliteDatabase<typeof schema>;
};

export function makeStatsRepo(deps: StatsRepoDeps = {}) {
  const database = deps.db || db;

  return {
    /**
     * Get user profile ID and timezone from auth user ID
     * @param userId - The auth user ID (from users table)
     * @returns User profile ID and timezone, or null if not found
     */
    async getUserProfileId(userId: string) {
      const result = await database
        .select({
          id: schema.userProfiles.id,
          timezone: schema.userProfiles.timezone,
        })
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, userId))
        .limit(1);

      return result[0] || null;
    },

    /**
     * Get today's progress: total scheduled steps and completed count
     * @param userProfileId - The user profile ID (UUID)
     * @param todayDate - Today's date in YYYY-MM-DD format (in user's timezone)
     * @returns Object with total and completed counts
     */
    async getTodayProgress(userProfileId: string, todayDate: string) {
      const result = await database
        .select({
          total: sql<number>`count(*)::int`,
          completed: sql<number>`count(*) FILTER (WHERE ${schema.routineStepCompletions.status} IN ('on-time', 'late'))::int`,
        })
        .from(schema.routineStepCompletions)
        .where(
          and(
            eq(schema.routineStepCompletions.userProfileId, userProfileId),
            sql`${schema.routineStepCompletions.scheduledDate} = ${todayDate}::date`,
          ),
        );

      return result[0] || { total: 0, completed: 0 };
    },

    /**
     * Calculate current streak: consecutive perfect days from today backwards
     * A perfect day = all scheduled steps completed (status 'on-time' or 'late')
     * @param userProfileId - The user profile ID (UUID)
     * @param todayDate - Today's date in YYYY-MM-DD format (in user's timezone)
     * @returns Number of consecutive perfect days
     */
    async getCurrentStreak(userProfileId: string, todayDate: string) {
      // Get daily completion stats, grouped by date, newest first
      const completions = await database
        .select({
          scheduledDate: schema.routineStepCompletions.scheduledDate,
          total: sql<number>`count(*)::int`,
          completed: sql<number>`count(*) FILTER (WHERE ${schema.routineStepCompletions.status} IN ('on-time', 'late'))::int`,
        })
        .from(schema.routineStepCompletions)
        .where(
          and(
            eq(schema.routineStepCompletions.userProfileId, userProfileId),
            sql`${schema.routineStepCompletions.scheduledDate} <= ${todayDate}::date`, // Only past/today
          ),
        )
        .groupBy(schema.routineStepCompletions.scheduledDate)
        .orderBy(sql`${schema.routineStepCompletions.scheduledDate} DESC`);

      // Calculate streak: count consecutive perfect days from today backwards
      let streak = 0;
      for (const day of completions) {
        if (day.completed === day.total && day.total > 0) {
          streak++; // Perfect day, continue streak
        } else {
          break; // Incomplete day, stop counting
        }
      }

      return streak;
    },

    /**
     * Get weekly compliance: percentage of completed steps in last 7 days
     * @param userProfileId - The user profile ID (UUID)
     * @param weekStartDate - Start of week in YYYY-MM-DD format (7 days ago)
     * @param weekEndDate - End of week in YYYY-MM-DD format (today)
     * @returns Object with total and completed counts for the week
     */
    async getWeeklyCompliance(
      userProfileId: string,
      weekStartDate: string,
      weekEndDate: string,
    ) {
      const result = await database
        .select({
          total: sql<number>`count(*)::int`,
          completed: sql<number>`count(*) FILTER (WHERE ${schema.routineStepCompletions.status} IN ('on-time', 'late'))::int`,
        })
        .from(schema.routineStepCompletions)
        .where(
          and(
            eq(schema.routineStepCompletions.userProfileId, userProfileId),
            sql`${schema.routineStepCompletions.scheduledDate} >= ${weekStartDate}::date`,
            sql`${schema.routineStepCompletions.scheduledDate} <= ${weekEndDate}::date`,
          ),
        );

      return result[0] || { total: 0, completed: 0 };
    },
  };
}

// Export the type for testing/dependency injection
export type StatsRepo = ReturnType<typeof makeStatsRepo>;
