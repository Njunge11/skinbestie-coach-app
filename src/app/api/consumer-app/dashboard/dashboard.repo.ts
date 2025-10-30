// Repository layer for dashboard data access
// Uses optimized queries with JOINs for minimal database round trips

import { eq, and, asc, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

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
          id: schema.userProfiles.id,
          firstName: schema.userProfiles.firstName,
          lastName: schema.userProfiles.lastName,
          email: schema.userProfiles.email,
          nickname: schema.userProfiles.nickname,
          skinType: schema.userProfiles.skinType,
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
     *
     * Type is inferred from the query - follows TYPE_SYSTEM_GUIDE principles
     */
    async getTodayRoutineSteps(userId: string, date: Date) {
      // First get the user profile ID from auth user ID
      const userProfile = await database
        .select({ id: schema.userProfiles.id })
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, userId))
        .limit(1);

      if (!userProfile[0]) {
        return [];
      }

      // Format date as YYYY-MM-DD for PostgreSQL date comparison
      const dateStr = date.toISOString().split("T")[0];

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
            sql`${schema.routineStepCompletions.scheduledDate} = ${dateStr}::date`,
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
  };
}

// Export inferred types for external consumers
// Following TYPE_SYSTEM_GUIDE: derive types from implementation, not manual duplication
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
