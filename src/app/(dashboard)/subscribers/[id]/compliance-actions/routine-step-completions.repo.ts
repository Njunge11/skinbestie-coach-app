/**
 * Real repository for routine step completions using Drizzle ORM
 */

import { db } from "@/lib/db";
import {
  routineStepCompletions,
  type RoutineStepCompletion,
} from "@/lib/db/schema";
import { eq, and, gte, lte, lt, inArray, asc } from "drizzle-orm";

// Re-export type from schema (single source of truth)
export type { RoutineStepCompletion };

export type NewRoutineStepCompletion = Omit<
  RoutineStepCompletion,
  "id" | "createdAt" | "updatedAt"
>;

export function makeRoutineStepCompletionsRepo() {
  return {
    /**
     * Create a new routine step completion record
     */
    async create(completion: NewRoutineStepCompletion) {
      const [created] = await db
        .insert(routineStepCompletions)
        .values(completion)
        .returning();

      return created as RoutineStepCompletion;
    },

    /**
     * Batch create multiple completions (for generating schedules)
     */
    async createMany(completions: NewRoutineStepCompletion[]) {
      if (completions.length === 0) return [];

      const created = await db
        .insert(routineStepCompletions)
        .values(completions)
        .returning();

      return created as RoutineStepCompletion[];
    },

    /**
     * Find all completions for a user
     */
    async findByUserId(userId: string) {
      const results = await db
        .select({
          id: routineStepCompletions.id,
          routineProductId: routineStepCompletions.routineProductId,
          userProfileId: routineStepCompletions.userProfileId,
          scheduledDate: routineStepCompletions.scheduledDate,
          scheduledTimeOfDay: routineStepCompletions.scheduledTimeOfDay,
          onTimeDeadline: routineStepCompletions.onTimeDeadline,
          gracePeriodEnd: routineStepCompletions.gracePeriodEnd,
          completedAt: routineStepCompletions.completedAt,
          status: routineStepCompletions.status,
          createdAt: routineStepCompletions.createdAt,
          updatedAt: routineStepCompletions.updatedAt,
        })
        .from(routineStepCompletions)
        .where(eq(routineStepCompletions.userProfileId, userId))
        .orderBy(asc(routineStepCompletions.scheduledDate));

      return results as RoutineStepCompletion[];
    },

    /**
     * Find completions for a user within a date range
     */
    async findByUserAndDateRange(
      userId: string,
      startDate: Date,
      endDate: Date,
    ) {
      const results = await db
        .select({
          id: routineStepCompletions.id,
          routineProductId: routineStepCompletions.routineProductId,
          userProfileId: routineStepCompletions.userProfileId,
          scheduledDate: routineStepCompletions.scheduledDate,
          scheduledTimeOfDay: routineStepCompletions.scheduledTimeOfDay,
          onTimeDeadline: routineStepCompletions.onTimeDeadline,
          gracePeriodEnd: routineStepCompletions.gracePeriodEnd,
          completedAt: routineStepCompletions.completedAt,
          status: routineStepCompletions.status,
          createdAt: routineStepCompletions.createdAt,
          updatedAt: routineStepCompletions.updatedAt,
        })
        .from(routineStepCompletions)
        .where(
          and(
            eq(routineStepCompletions.userProfileId, userId),
            gte(routineStepCompletions.scheduledDate, startDate),
            lte(routineStepCompletions.scheduledDate, endDate),
          ),
        )
        .orderBy(asc(routineStepCompletions.scheduledDate));

      return results as RoutineStepCompletion[];
    },

    /**
     * Find completions for a user on a specific date
     */
    async findByUserAndDate(userId: string, date: Date) {
      // Get the date without time (YYYY-MM-DD)
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);

      const nextDay = new Date(dateOnly);
      nextDay.setDate(nextDay.getDate() + 1);

      const results = await db
        .select({
          id: routineStepCompletions.id,
          routineProductId: routineStepCompletions.routineProductId,
          userProfileId: routineStepCompletions.userProfileId,
          scheduledDate: routineStepCompletions.scheduledDate,
          scheduledTimeOfDay: routineStepCompletions.scheduledTimeOfDay,
          onTimeDeadline: routineStepCompletions.onTimeDeadline,
          gracePeriodEnd: routineStepCompletions.gracePeriodEnd,
          completedAt: routineStepCompletions.completedAt,
          status: routineStepCompletions.status,
          createdAt: routineStepCompletions.createdAt,
          updatedAt: routineStepCompletions.updatedAt,
        })
        .from(routineStepCompletions)
        .where(
          and(
            eq(routineStepCompletions.userProfileId, userId),
            gte(routineStepCompletions.scheduledDate, dateOnly),
            lt(routineStepCompletions.scheduledDate, nextDay),
          ),
        )
        .orderBy(asc(routineStepCompletions.scheduledTimeOfDay));

      return results as RoutineStepCompletion[];
    },

    /**
     * Find a single completion by ID
     */
    async findById(id: string) {
      const [result] = await db
        .select({
          id: routineStepCompletions.id,
          routineProductId: routineStepCompletions.routineProductId,
          userProfileId: routineStepCompletions.userProfileId,
          scheduledDate: routineStepCompletions.scheduledDate,
          scheduledTimeOfDay: routineStepCompletions.scheduledTimeOfDay,
          onTimeDeadline: routineStepCompletions.onTimeDeadline,
          gracePeriodEnd: routineStepCompletions.gracePeriodEnd,
          completedAt: routineStepCompletions.completedAt,
          status: routineStepCompletions.status,
          createdAt: routineStepCompletions.createdAt,
          updatedAt: routineStepCompletions.updatedAt,
        })
        .from(routineStepCompletions)
        .where(eq(routineStepCompletions.id, id))
        .limit(1);

      return (result as RoutineStepCompletion) ?? null;
    },

    /**
     * Update a completion record
     */
    async update(
      id: string,
      updates: Partial<Omit<RoutineStepCompletion, "id" | "createdAt">>,
    ) {
      const [updated] = await db
        .update(routineStepCompletions)
        .set(updates)
        .where(eq(routineStepCompletions.id, id))
        .returning();

      return (updated as RoutineStepCompletion) ?? null;
    },

    /**
     * Update multiple completions by their IDs
     * Returns the number of updated records
     */
    async updateMany(
      ids: string[],
      updates: Partial<Omit<RoutineStepCompletion, "id" | "createdAt">>,
    ) {
      if (ids.length === 0) return 0;

      const result = await db
        .update(routineStepCompletions)
        .set(updates)
        .where(inArray(routineStepCompletions.id, ids))
        .returning();

      return result.length;
    },

    /**
     * Update all pending completions that are past their grace period to 'missed'
     * Returns the number of updated records
     */
    async markOverdue(userId: string, now: Date) {
      const result = await db
        .update(routineStepCompletions)
        .set({
          status: "missed",
          updatedAt: now,
        })
        .where(
          and(
            eq(routineStepCompletions.userProfileId, userId),
            eq(routineStepCompletions.status, "pending"),
            lt(routineStepCompletions.gracePeriodEnd, now),
          ),
        )
        .returning();

      return result.length;
    },

    /**
     * Delete completions by routine product ID
     * Used when regenerating schedules after editing a product
     * Returns the number of deleted records
     */
    async deleteByRoutineProductId(
      routineProductId: string,
      fromDate?: Date,
      statuses?: ("pending" | "missed")[],
    ) {
      const conditions = [
        eq(routineStepCompletions.routineProductId, routineProductId),
      ];

      if (fromDate) {
        conditions.push(gte(routineStepCompletions.scheduledDate, fromDate));
      }

      if (statuses && statuses.length > 0) {
        conditions.push(inArray(routineStepCompletions.status, statuses));
      }

      const result = await db
        .delete(routineStepCompletions)
        .where(and(...conditions))
        .returning();

      return result.length;
    },

    /**
     * Delete all completions for a user (for cleanup)
     */
    async deleteByUserId(userId: string) {
      const result = await db
        .delete(routineStepCompletions)
        .where(eq(routineStepCompletions.userProfileId, userId))
        .returning();

      return result.length;
    },
  };
}
