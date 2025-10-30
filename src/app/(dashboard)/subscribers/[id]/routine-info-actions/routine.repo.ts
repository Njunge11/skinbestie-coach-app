// Real repository using Drizzle ORM (production)

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { skincareRoutines } from "@/lib/db/schema";
import { type SkincareRoutineRow } from "@/lib/db/types";

// Type definitions derived from schema
export type Routine = Pick<
  SkincareRoutineRow,
  | "id"
  | "userProfileId"
  | "name"
  | "startDate"
  | "endDate"
  | "status"
  | "createdAt"
  | "updatedAt"
>;

export type NewRoutine = Omit<Routine, "id" | "createdAt" | "updatedAt">;

export function makeRoutineRepo() {
  return {
    async findById(routineId: string): Promise<Routine | null> {
      const [routine] = await db
        .select({
          id: skincareRoutines.id,
          userProfileId: skincareRoutines.userProfileId,
          name: skincareRoutines.name,
          startDate: skincareRoutines.startDate,
          endDate: skincareRoutines.endDate,
          status: skincareRoutines.status,
          createdAt: skincareRoutines.createdAt,
          updatedAt: skincareRoutines.updatedAt,
        })
        .from(skincareRoutines)
        .where(eq(skincareRoutines.id, routineId))
        .limit(1);

      return routine ? (routine as Routine) : null;
    },

    async findByUserId(userId: string): Promise<Routine | null> {
      try {
        const [routine] = await db
          .select({
            id: skincareRoutines.id,
            userProfileId: skincareRoutines.userProfileId,
            name: skincareRoutines.name,
            startDate: skincareRoutines.startDate,
            endDate: skincareRoutines.endDate,
            status: skincareRoutines.status,
            createdAt: skincareRoutines.createdAt,
            updatedAt: skincareRoutines.updatedAt,
          })
          .from(skincareRoutines)
          .where(eq(skincareRoutines.userProfileId, userId))
          .limit(1);

        return routine ? (routine as Routine) : null;
      } catch (error) {
        console.error("❌ Error in findByUserId:", error);
        console.error("Query params:", { userId });
        throw error;
      }
    },

    async create(routine: NewRoutine): Promise<Routine> {
      const [newRoutine] = await db
        .insert(skincareRoutines)
        .values(routine)
        .returning();

      return newRoutine as Routine;
    },

    async update(
      routineId: string,
      updates: Partial<Routine>,
    ): Promise<Routine | null> {
      const [updatedRoutine] = await db
        .update(skincareRoutines)
        .set(updates)
        .where(eq(skincareRoutines.id, routineId))
        .returning();

      return updatedRoutine ? (updatedRoutine as Routine) : null;
    },

    async deleteById(routineId: string): Promise<Routine | null> {
      const [deletedRoutine] = await db
        .delete(skincareRoutines)
        .where(eq(skincareRoutines.id, routineId))
        .returning();

      return deletedRoutine ? (deletedRoutine as Routine) : null;
    },
  };
}
