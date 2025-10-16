// Real repository using Drizzle ORM (production)

import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { skincareGoals } from "@/lib/db/schema";
import type { Goal, NewGoal } from "./goals.repo.fake";

export function makeGoalsRepo() {
  return {
    async findByUserId(userId: string): Promise<Goal[]> {
      const goals = await db
        .select()
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
      // To avoid unique constraint violations on (userProfileId, order),
      // we first set all goals to temporary negative order values,
      // then update to final order values

      // Step 1: Set all goals to temporary negative orders
      for (let i = 0; i < updates.length; i++) {
        const { id, data } = updates[i];
        await db
          .update(skincareGoals)
          .set({ order: -(i + 1), updatedAt: data.updatedAt })
          .where(eq(skincareGoals.id, id));
      }

      // Step 2: Set final order values
      for (const { id, data } of updates) {
        await db
          .update(skincareGoals)
          .set(data)
          .where(eq(skincareGoals.id, id));
      }
    },
  };
}
