// Real repository using Drizzle ORM (production)

import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { skincareGoals } from "@/lib/db/schema";
import { type SkincareGoalRow } from "@/lib/db/types";

// Type definitions derived from schema
export type Goal = Pick<
  SkincareGoalRow,
  | "id"
  | "templateId"
  | "description"
  | "isPrimaryGoal"
  | "complete"
  | "completedAt"
  | "order"
  | "createdAt"
  | "updatedAt"
>;

export type NewGoal = Omit<
  Goal,
  "id" | "createdAt" | "updatedAt" | "completedAt"
>;

export function makeGoalsRepo() {
  return {
    /**
     * Find goals by template ID
     */
    async findByTemplateId(templateId: string): Promise<Goal[]> {
      const goals = await db
        .select({
          id: skincareGoals.id,
          templateId: skincareGoals.templateId,
          description: skincareGoals.description,
          isPrimaryGoal: skincareGoals.isPrimaryGoal,
          complete: skincareGoals.complete,
          completedAt: skincareGoals.completedAt,
          order: skincareGoals.order,
          createdAt: skincareGoals.createdAt,
          updatedAt: skincareGoals.updatedAt,
        })
        .from(skincareGoals)
        .where(eq(skincareGoals.templateId, templateId))
        .orderBy(asc(skincareGoals.order));

      return goals as Goal[];
    },

    async findById(goalId: string): Promise<Goal | null> {
      const [goal] = await db
        .select({
          id: skincareGoals.id,
          templateId: skincareGoals.templateId,
          description: skincareGoals.description,
          isPrimaryGoal: skincareGoals.isPrimaryGoal,
          complete: skincareGoals.complete,
          completedAt: skincareGoals.completedAt,
          order: skincareGoals.order,
          createdAt: skincareGoals.createdAt,
          updatedAt: skincareGoals.updatedAt,
        })
        .from(skincareGoals)
        .where(eq(skincareGoals.id, goalId))
        .limit(1);

      return goal ? (goal as Goal) : null;
    },

    async unmarkAllPrimary(templateId: string): Promise<void> {
      await db
        .update(skincareGoals)
        .set({ isPrimaryGoal: false })
        .where(eq(skincareGoals.templateId, templateId));
    },

    async create(goal: NewGoal): Promise<Goal> {
      const [newGoal] = await db.insert(skincareGoals).values(goal).returning();

      return newGoal as Goal;
    },

    async update(goalId: string, updates: Partial<Goal>): Promise<Goal | null> {
      const [updatedGoal] = await db
        .update(skincareGoals)
        .set(updates)
        .where(eq(skincareGoals.id, goalId))
        .returning();

      return updatedGoal ? (updatedGoal as Goal) : null;
    },

    /**
     * Toggle goal completion status
     */
    async toggleComplete(
      goalId: string,
      complete: boolean,
    ): Promise<Goal | null> {
      const [updatedGoal] = await db
        .update(skincareGoals)
        .set({
          complete,
          completedAt: complete ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(skincareGoals.id, goalId))
        .returning();

      return updatedGoal ? (updatedGoal as Goal) : null;
    },

    async deleteById(goalId: string): Promise<Goal | null> {
      const [deletedGoal] = await db
        .delete(skincareGoals)
        .where(eq(skincareGoals.id, goalId))
        .returning();

      return deletedGoal ? (deletedGoal as Goal) : null;
    },

    async updateMany(
      updates: Array<{ id: string; data: Partial<Goal> }>,
    ): Promise<void> {
      if (updates.length === 0) return;

      try {
        // Use transaction to update each goal
        // Simple and working approach
        await db.transaction(async (tx) => {
          for (const update of updates) {
            try {
              await tx
                .update(skincareGoals)
                .set({
                  order: update.data.order,
                  updatedAt: update.data.updatedAt,
                })
                .where(eq(skincareGoals.id, update.id));
            } catch (innerError) {
              console.error(`❌ Error updating goal ${update.id}:`, innerError);
              throw innerError; // Re-throw to rollback transaction
            }
          }
        });
      } catch (error) {
        console.error("❌ Transaction failed:", error);
        console.error("Error details:", {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error; // Re-throw for the action to handle
      }
    },
  };
}
