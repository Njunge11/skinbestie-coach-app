// Repository layer for dashboard data access
// Uses optimized queries with JOINs for minimal database round trips

import { eq, and, asc, sql, desc } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { formatInTimeZone } from "date-fns-tz";

// For dependency injection in tests
// Accept any Drizzle database instance (PostgresJs or PgLite)
export type DashboardRepoDeps = {
  db?:
    | typeof db
    | PostgresJsDatabase<typeof schema>
    | PgliteDatabase<typeof schema>;
};

export function makeDashboardRepo(deps: DashboardRepoDeps = {}) {
  const database = deps.db || db;

  return {
    /**
     * Get user dashboard data with setup status in a single optimized query
     * @param userId - The auth user ID (from users table)
     *
     * Type is inferred from the query - follows TYPE_SYSTEM_GUIDE principles
     */
    async getUserDashboardData(userId: string) {
      const result = await database
        .select({
          userId: schema.userProfiles.userId,
          userProfileId: schema.userProfiles.id,
          firstName: schema.userProfiles.firstName,
          lastName: schema.userProfiles.lastName,
          email: schema.userProfiles.email,
          phoneNumber: schema.userProfiles.phoneNumber,
          dateOfBirth: schema.userProfiles.dateOfBirth,
          nickname: schema.userProfiles.nickname,
          skinType: schema.userProfiles.skinType,
          concerns: schema.userProfiles.concerns,
          hasAllergies: schema.userProfiles.hasAllergies,
          allergyDetails: schema.userProfiles.allergyDetails,
          isSubscribed: schema.userProfiles.isSubscribed,
          occupation: schema.userProfiles.occupation,
          bio: schema.userProfiles.bio,
          timezone: schema.userProfiles.timezone,
          hasCompletedSkinTest: schema.userProfiles.hasCompletedSkinTest,
          hasCompletedBooking: schema.userProfiles.hasCompletedBooking,
          goalsTemplateId: schema.skinGoalsTemplate.id,
          goalsTemplateStatus: schema.skinGoalsTemplate.status,
          goalsAcknowledgedByClient:
            schema.skinGoalsTemplate.goalsAcknowledgedByClient,
          routineId: schema.skincareRoutines.id,
          routineStatus: schema.skincareRoutines.status,
        })
        .from(schema.userProfiles)
        .leftJoin(
          schema.skinGoalsTemplate,
          eq(schema.skinGoalsTemplate.userId, schema.userProfiles.id),
        )
        .leftJoin(
          schema.skincareRoutines,
          eq(schema.skincareRoutines.userProfileId, schema.userProfiles.id),
        )
        .where(eq(schema.userProfiles.userId, userId)) // Query by auth user ID, not profile ID
        .limit(1);

      return result[0] || null;
    },

    /**
     * Get published goals for a user
     * Returns goals only if template exists and is published
     * @param userId - The auth user ID (from users table)
     *
     * Type is inferred from the query - follows TYPE_SYSTEM_GUIDE principles
     */
    async getPublishedGoals(userId: string) {
      // First get the user profile ID from auth user ID
      const userProfile = await database
        .select({ id: schema.userProfiles.id })
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, userId))
        .limit(1);

      if (!userProfile[0]) {
        return [];
      }

      const result = await database
        .select({
          id: schema.skincareGoals.id,
          description: schema.skincareGoals.description,
          timeline: schema.skincareGoals.timeline,
          complete: schema.skincareGoals.complete,
          completedAt: schema.skincareGoals.completedAt,
          order: schema.skincareGoals.order,
          isPrimaryGoal: schema.skincareGoals.isPrimaryGoal,
        })
        .from(schema.skincareGoals)
        .innerJoin(
          schema.skinGoalsTemplate,
          and(
            eq(schema.skincareGoals.templateId, schema.skinGoalsTemplate.id),
            eq(schema.skinGoalsTemplate.userId, userProfile[0].id),
            eq(schema.skinGoalsTemplate.status, "published"),
          ),
        )
        .orderBy(asc(schema.skincareGoals.order));

      return result;
    },

    /**
     * Get today's routine steps with completion status
     * Only returns steps for published routines
     * @param userId - The auth user ID (from users table)
     * @param date - Current date/time (used to calculate "today" in user's timezone)
     *
     * Type is inferred from the query - follows TYPE_SYSTEM_GUIDE principles
     */
    async getTodayRoutineSteps(userId: string, date: Date) {
      // First get the user profile with timezone
      const userProfile = await database
        .select({
          id: schema.userProfiles.id,
          timezone: schema.userProfiles.timezone,
        })
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, userId))
        .limit(1);

      if (!userProfile[0]) {
        return [];
      }

      // Calculate "today" in the user's timezone
      const { toZonedTime, format } = await import("date-fns-tz");
      const userTimezone = userProfile[0].timezone;
      const nowInUserTz = toZonedTime(date, userTimezone);
      const todayInUserTz = format(nowInUserTz, "yyyy-MM-dd", {
        timeZone: userTimezone,
      });

      const result = await database
        .select({
          id: schema.routineStepCompletions.id,
          routineStep: schema.skincareRoutineProducts.routineStep,
          productName: schema.skincareRoutineProducts.productName,
          productUrl: schema.skincareRoutineProducts.productUrl,
          instructions: schema.skincareRoutineProducts.instructions,
          timeOfDay: schema.skincareRoutineProducts.timeOfDay,
          order: schema.skincareRoutineProducts.order,
          status: schema.routineStepCompletions.status,
          completedAt: schema.routineStepCompletions.completedAt,
        })
        .from(schema.routineStepCompletions)
        .innerJoin(
          schema.skincareRoutineProducts,
          eq(
            schema.routineStepCompletions.routineProductId,
            schema.skincareRoutineProducts.id,
          ),
        )
        .innerJoin(
          schema.skincareRoutines,
          and(
            eq(
              schema.skincareRoutineProducts.routineId,
              schema.skincareRoutines.id,
            ),
            eq(schema.skincareRoutines.status, "published"),
          ),
        )
        .where(
          and(
            eq(schema.routineStepCompletions.userProfileId, userProfile[0].id),
            sql`${schema.routineStepCompletions.scheduledDate} = ${todayInUserTz}::date`,
          ),
        )
        .orderBy(
          asc(schema.skincareRoutineProducts.timeOfDay),
          asc(schema.skincareRoutineProducts.order),
        );

      // Map database status to API status format
      return result.map((step) => ({
        ...step,
        status:
          step.status === "on-time" ? ("completed" as const) : step.status,
      }));
    },

    /**
     * Get routine with products grouped by morning/evening for viewing
     * Returns routine structure if published
     * @param userId - The auth user ID (from users table)
     *
     * Type is inferred from the query - follows TYPE_SYSTEM_GUIDE principles
     */
    async getRoutine(userId: string) {
      // First get the user profile ID from auth user ID
      const userProfile = await database
        .select({ id: schema.userProfiles.id })
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, userId))
        .limit(1);

      if (!userProfile[0]) {
        return null;
      }

      // Get routine metadata
      const routineResult = await database
        .select({
          id: schema.skincareRoutines.id,
          name: schema.skincareRoutines.name,
          startDate: schema.skincareRoutines.startDate,
          endDate: schema.skincareRoutines.endDate,
          productPurchaseInstructions:
            schema.skincareRoutines.productPurchaseInstructions,
        })
        .from(schema.skincareRoutines)
        .where(
          and(
            eq(schema.skincareRoutines.userProfileId, userProfile[0].id),
            eq(schema.skincareRoutines.status, "published"),
          ),
        )
        .limit(1);

      if (!routineResult[0]) {
        return null;
      }

      // Get all products for this routine
      const products = await database
        .select({
          id: schema.skincareRoutineProducts.id,
          routineStep: schema.skincareRoutineProducts.routineStep,
          productName: schema.skincareRoutineProducts.productName,
          productUrl: schema.skincareRoutineProducts.productUrl,
          instructions: schema.skincareRoutineProducts.instructions,
          frequency: schema.skincareRoutineProducts.frequency,
          days: schema.skincareRoutineProducts.days,
          timeOfDay: schema.skincareRoutineProducts.timeOfDay,
          order: schema.skincareRoutineProducts.order,
        })
        .from(schema.skincareRoutineProducts)
        .where(
          eq(schema.skincareRoutineProducts.routineId, routineResult[0].id),
        )
        .orderBy(
          asc(schema.skincareRoutineProducts.timeOfDay),
          asc(schema.skincareRoutineProducts.order),
        );

      // Group products by timeOfDay
      const morning = products.filter((p) => p.timeOfDay === "morning");
      const evening = products.filter((p) => p.timeOfDay === "evening");

      return {
        ...routineResult[0],
        morning,
        evening,
      };
    },

    /**
     * Get profile tags for a user profile
     * @param userProfileId - The user profile ID (from user_profiles table)
     *
     * Type is inferred from the query - follows TYPE_SYSTEM_GUIDE principles
     */
    async getProfileTags(userProfileId: string) {
      const result = await database
        .select({
          tag: schema.profileTags.tag,
        })
        .from(schema.profileTags)
        .where(eq(schema.profileTags.userProfileId, userProfileId));

      // Return array of tag strings
      return result.map((row) => row.tag);
    },

    /**
     * Get catchup steps - previous days' pending steps still within grace period
     * @param userId - The auth user ID (from users table)
     * @param date - Current date/time (used to calculate "today" and grace period check)
     *
     * Type is inferred from the query - follows TYPE_SYSTEM_GUIDE principles
     */
    async getCatchupSteps(userId: string, date: Date) {
      // First get the user profile with timezone
      const userProfile = await database
        .select({
          id: schema.userProfiles.id,
          timezone: schema.userProfiles.timezone,
        })
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, userId))
        .limit(1);

      if (!userProfile[0]) {
        return [];
      }

      // Calculate "today" in the user's timezone
      const userTimezone = userProfile[0].timezone;
      const todayInUserTz = formatInTimeZone(date, userTimezone, "yyyy-MM-dd");

      // IMPORTANT: Convert Date to ISO string before using in SQL template
      // PGlite (tests) accepts Date objects, but postgres-js (production) requires strings
      // See docs/DATABASE_GUIDE.md - Pitfall #11
      const currentTimestamp = date.toISOString();

      const result = await database
        .select({
          id: schema.routineStepCompletions.id,
          routineStep: schema.skincareRoutineProducts.routineStep,
          productName: schema.skincareRoutineProducts.productName,
          productUrl: schema.skincareRoutineProducts.productUrl,
          instructions: schema.skincareRoutineProducts.instructions,
          timeOfDay: schema.skincareRoutineProducts.timeOfDay,
          order: schema.skincareRoutineProducts.order,
          status: schema.routineStepCompletions.status,
          completedAt: schema.routineStepCompletions.completedAt,
          scheduledDate: schema.routineStepCompletions.scheduledDate,
          gracePeriodEnd: schema.routineStepCompletions.gracePeriodEnd,
        })
        .from(schema.routineStepCompletions)
        .innerJoin(
          schema.skincareRoutineProducts,
          eq(
            schema.routineStepCompletions.routineProductId,
            schema.skincareRoutineProducts.id,
          ),
        )
        .innerJoin(
          schema.skincareRoutines,
          and(
            eq(
              schema.skincareRoutineProducts.routineId,
              schema.skincareRoutines.id,
            ),
            eq(schema.skincareRoutines.status, "published"),
          ),
        )
        .where(
          and(
            eq(schema.routineStepCompletions.userProfileId, userProfile[0].id),
            // Scheduled before today
            sql`${schema.routineStepCompletions.scheduledDate} < ${todayInUserTz}::date`,
            // Only pending steps can be caught up
            eq(schema.routineStepCompletions.status, "pending"),
            // Still within grace period
            sql`${schema.routineStepCompletions.gracePeriodEnd} > ${currentTimestamp}::timestamptz`,
          ),
        )
        .orderBy(
          desc(schema.routineStepCompletions.scheduledDate),
          asc(schema.skincareRoutineProducts.timeOfDay),
          asc(schema.skincareRoutineProducts.order),
        );

      // Map database status to API status format (same as getTodayRoutineSteps)
      return result.map((step) => ({
        ...step,
        status:
          step.status === "on-time" ? ("completed" as const) : step.status,
      }));
    },
  };
}

// Export inferred types for external consumers
// Following TYPE_SYSTEM_GUIDE: derive types from implementation, not manual duplication
export type DashboardRepo = ReturnType<typeof makeDashboardRepo>;
export type DashboardUserData = Awaited<
  ReturnType<ReturnType<typeof makeDashboardRepo>["getUserDashboardData"]>
>;
export type Goal = Awaited<
  ReturnType<ReturnType<typeof makeDashboardRepo>["getPublishedGoals"]>
>[number];
export type RoutineStep = Awaited<
  ReturnType<ReturnType<typeof makeDashboardRepo>["getTodayRoutineSteps"]>
>[number];
export type Routine = Awaited<
  ReturnType<ReturnType<typeof makeDashboardRepo>["getRoutine"]>
>;
