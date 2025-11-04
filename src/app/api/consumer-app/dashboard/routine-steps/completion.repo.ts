// Repository layer for routine step completions
import { eq, and, sql, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

// For dependency injection in tests
export type CompletionRepoDeps = {
  db?:
    | typeof db
    | PostgresJsDatabase<typeof schema>
    | PgliteDatabase<typeof schema>;
};

export function makeCompletionRepo(deps: CompletionRepoDeps = {}) {
  const database = deps.db || db;

  return {
    /**
     * Get user profile ID from auth user ID
     * @param userId - The auth user ID (from users table)
     * @returns User profile ID or null if not found
     */
    async getUserProfileId(userId: string) {
      const result = await database
        .select({
          id: schema.userProfiles.id,
        })
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, userId))
        .limit(1);

      return result[0] || null;
    },

    /**
     * Update a single completion step
     * @param params - stepId, completed status, userProfileId, optional completedAt
     * @returns Updated completion or null if not found/not authorized
     */
    async updateCompletion(params: {
      stepId: string;
      completed: boolean;
      userProfileId: string;
      completedAt?: Date;
    }) {
      const { stepId, completed, userProfileId, completedAt } = params;

      console.log("[CompletionRepo] updateCompletion called:", {
        stepId,
        completed,
        userProfileId,
        completedAt: completedAt?.toISOString(),
      });

      // If marking as complete
      if (completed) {
        console.log(
          "[CompletionRepo] Marking as complete - fetching existing step",
        );

        // Check if step exists and is not missed
        const [existing] = await database
          .select()
          .from(schema.routineStepCompletions)
          .where(
            and(
              eq(schema.routineStepCompletions.id, stepId),
              eq(schema.routineStepCompletions.userProfileId, userProfileId),
            ),
          )
          .limit(1);

        if (!existing) {
          console.log("[CompletionRepo] Step not found for:", {
            stepId,
            userProfileId,
          });
          return null;
        }

        console.log("[CompletionRepo] Existing step found:", {
          id: existing.id,
          currentStatus: existing.status,
          scheduledDate: existing.scheduledDate,
          onTimeDeadline: existing.onTimeDeadline.toISOString(),
          gracePeriodEnd: existing.gracePeriodEnd.toISOString(),
        });

        // Cannot complete missed steps
        if (existing.status === "missed") {
          console.log("[CompletionRepo] Cannot complete missed step");
          return null;
        }

        // If already completed, return existing (idempotent)
        if (existing.status === "on-time" || existing.status === "late") {
          console.log("[CompletionRepo] Step already completed (idempotent):", {
            status: existing.status,
            completedAt: existing.completedAt?.toISOString(),
          });
          return existing;
        }

        // Calculate status based on completion time vs deadlines
        const completionTime = completedAt || new Date();

        // Check if past grace period (cannot complete)
        if (completionTime > existing.gracePeriodEnd) {
          console.log(
            "[CompletionRepo] Completion time is past grace period:",
            {
              completionTime: completionTime.toISOString(),
              gracePeriodEnd: existing.gracePeriodEnd.toISOString(),
            },
          );
          return null;
        }

        // Determine if on-time or late
        const status =
          completionTime <= existing.onTimeDeadline ? "on-time" : "late";

        console.log("[CompletionRepo] Calculating status:", {
          completionTime: completionTime.toISOString(),
          onTimeDeadline: existing.onTimeDeadline.toISOString(),
          gracePeriodEnd: existing.gracePeriodEnd.toISOString(),
          calculatedStatus: status,
        });

        // Update the completion
        const [updated] = await database
          .update(schema.routineStepCompletions)
          .set({
            status,
            completedAt: completionTime,
          })
          .where(
            and(
              eq(schema.routineStepCompletions.id, stepId),
              eq(schema.routineStepCompletions.userProfileId, userProfileId),
            ),
          )
          .returning();

        console.log("[CompletionRepo] Update complete:", {
          id: updated?.id,
          status: updated?.status,
          completedAt: updated?.completedAt?.toISOString(),
        });

        return updated || null;
      } else {
        console.log("[CompletionRepo] Marking as incomplete");

        // Marking as incomplete - revert to pending
        const [updated] = await database
          .update(schema.routineStepCompletions)
          .set({
            status: "pending",
            completedAt: null,
          })
          .where(
            and(
              eq(schema.routineStepCompletions.id, stepId),
              eq(schema.routineStepCompletions.userProfileId, userProfileId),
            ),
          )
          .returning();

        console.log("[CompletionRepo] Marked as incomplete:", {
          id: updated?.id,
          status: updated?.status,
        });

        return updated || null;
      }
    },

    /**
     * Update all completions for a specific date
     * @param params - date, completed status, userProfileId, optional completedAt
     * @returns Array of updated completions
     */
    async updateCompletionsByDate(params: {
      date: string;
      completed: boolean;
      userProfileId: string;
      completedAt?: Date;
    }) {
      const { date, completed, userProfileId, completedAt } = params;

      if (completed) {
        // Get all pending/completed steps for the date (skip missed)
        const steps = await database
          .select()
          .from(schema.routineStepCompletions)
          .where(
            and(
              eq(schema.routineStepCompletions.userProfileId, userProfileId),
              sql`${schema.routineStepCompletions.scheduledDate} = ${date}::date`,
              sql`${schema.routineStepCompletions.status} != 'missed'`,
            ),
          );

        if (steps.length === 0) return [];

        const completionTime = completedAt || new Date();

        // Update each step individually to calculate correct status
        const updates = await Promise.all(
          steps.map(async (step) => {
            // If already completed, keep existing
            if (step.status === "on-time" || step.status === "late") {
              return step;
            }

            // Calculate status based on completion time vs deadline
            const status =
              completionTime <= step.onTimeDeadline ? "on-time" : "late";

            const [updated] = await database
              .update(schema.routineStepCompletions)
              .set({
                status,
                completedAt: completionTime,
              })
              .where(eq(schema.routineStepCompletions.id, step.id))
              .returning();

            return updated;
          }),
        );

        return updates;
      } else {
        // Marking as incomplete - revert all to pending
        const updated = await database
          .update(schema.routineStepCompletions)
          .set({
            status: "pending",
            completedAt: null,
          })
          .where(
            and(
              eq(schema.routineStepCompletions.userProfileId, userProfileId),
              sql`${schema.routineStepCompletions.scheduledDate} = ${date}::date`,
            ),
          )
          .returning();

        return updated;
      }
    },

    /**
     * Update multiple completions by step IDs
     * @param params - stepIds array, completed status, userProfileId, optional completedAt
     * @returns Array of updated completions
     */
    async updateCompletionsByStepIds(params: {
      stepIds: string[];
      completed: boolean;
      userProfileId: string;
      completedAt?: Date;
    }) {
      const { stepIds, completed, userProfileId, completedAt } = params;

      console.log("[CompletionRepo] updateCompletionsByStepIds called:", {
        stepIds,
        completed,
        userProfileId,
        completedAt: completedAt?.toISOString(),
      });

      if (completed) {
        // Get all matching steps
        const steps = await database
          .select()
          .from(schema.routineStepCompletions)
          .where(
            and(
              eq(schema.routineStepCompletions.userProfileId, userProfileId),
              inArray(schema.routineStepCompletions.id, stepIds),
            ),
          );

        console.log("[CompletionRepo] Found steps:", {
          count: steps.length,
          stepIds: steps.map((s) => s.id),
        });

        if (steps.length === 0) return [];

        const completionTime = completedAt || new Date();

        // Update each step individually to calculate correct status
        const updates = await Promise.all(
          steps.map(async (step) => {
            // Cannot complete missed steps
            if (step.status === "missed") {
              console.log("[CompletionRepo] Skipping missed step:", step.id);
              return step;
            }

            // If already completed, keep existing (idempotent)
            if (step.status === "on-time" || step.status === "late") {
              console.log(
                "[CompletionRepo] Step already completed (idempotent):",
                step.id,
              );
              return step;
            }

            // Check if past grace period
            if (completionTime > step.gracePeriodEnd) {
              console.log("[CompletionRepo] Step past grace period:", step.id);
              return step;
            }

            // Calculate status based on completion time vs deadline
            const status =
              completionTime <= step.onTimeDeadline ? "on-time" : "late";

            console.log("[CompletionRepo] Updating step:", {
              id: step.id,
              status,
            });

            const [updated] = await database
              .update(schema.routineStepCompletions)
              .set({
                status,
                completedAt: completionTime,
              })
              .where(
                and(
                  eq(schema.routineStepCompletions.id, step.id),
                  eq(
                    schema.routineStepCompletions.userProfileId,
                    userProfileId,
                  ),
                ),
              )
              .returning();

            return updated || step;
          }),
        );

        return updates;
      } else {
        // Marking as incomplete - revert all to pending
        const updated = await database
          .update(schema.routineStepCompletions)
          .set({
            status: "pending",
            completedAt: null,
          })
          .where(
            and(
              eq(schema.routineStepCompletions.userProfileId, userProfileId),
              inArray(schema.routineStepCompletions.id, stepIds),
            ),
          )
          .returning();

        console.log("[CompletionRepo] Marked as incomplete:", {
          count: updated.length,
        });

        return updated;
      }
    },
  };
}

// Export type for testing/dependency injection
export type CompletionRepo = ReturnType<typeof makeCompletionRepo>;
