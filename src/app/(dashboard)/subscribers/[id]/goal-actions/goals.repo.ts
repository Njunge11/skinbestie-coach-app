// Real repository using Drizzle ORM (production)

import { eq, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { skincareGoals } from "@/lib/db/schema";
import type { Goal, NewGoal } from "./goals.repo.fake";

export function makeGoalsRepo() {
  return {
    async findByUserId(userId: string): Promise<Goal[]> {
      const goals = await db
        .select({
          id: skincareGoals.id,
          userProfileId: skincareGoals.userProfileId,
          name: skincareGoals.name,
          description: skincareGoals.description,
          timeframe: skincareGoals.timeframe,
          complete: skincareGoals.complete,
          order: skincareGoals.order,
          createdAt: skincareGoals.createdAt,
          updatedAt: skincareGoals.updatedAt,
        })
        .from(skincareGoals)
        .where(eq(skincareGoals.userProfileId, userId))
        .orderBy(asc(skincareGoals.order))
        .execute();

      return goals as Goal[];
    },

    async create(goal: NewGoal): Promise<Goal> {
      const [newGoal] = await db
        .insert(skincareGoals)
        .values(goal)
        .returning();

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

    async deleteById(goalId: string): Promise<Goal | null> {
      const [deletedGoal] = await db
        .delete(skincareGoals)
        .where(eq(skincareGoals.id, goalId))
        .returning();

      return deletedGoal ? (deletedGoal as Goal) : null;
    },

    async updateMany(updates: Array<{ id: string; data: Partial<Goal> }>): Promise<void> {
      if (updates.length === 0) return;

      // Use transaction to avoid unique constraint violations
      await db.transaction(async (tx) => {
        // Build CASE statements for batch update
        const ids = updates.map((u) => `'${u.id}'`).join(", ");

        const orderCases = updates
          .map((u) => `WHEN '${u.id}' THEN ${u.data.order}`)
          .join(" ");

        const updatedAtCases = updates
          .map((u) => `WHEN '${u.id}' THEN '${u.data.updatedAt?.toISOString()}'`)
          .join(" ");

        // Single batch UPDATE query (2N queries → 1 query)
        await tx.execute(sql.raw(`
          UPDATE skincare_goals
          SET
            "order" = (CASE id ${orderCases} END),
            updated_at = (CASE id ${updatedAtCases} END)::timestamp
          WHERE id IN (${ids})
        `));
      });
    },
  };
}
