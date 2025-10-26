// Real repository using Drizzle ORM (production)

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { skincareRoutines } from "@/lib/db/schema";

// Type definitions
export type Routine = {
  id: string;
  userProfileId: string;
  name: string;
  startDate: Date;
  endDate: Date | null;
  status: "draft" | "published";
  createdAt: Date;
  updatedAt: Date;
};

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
        .limit(1)
        .execute();

      return routine ? (routine as Routine) : null;
    },

    async findByUserId(userId: string): Promise<Routine | null> {
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
        .limit(1)
        .execute();

      return routine ? (routine as Routine) : null;
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
      updates: Partial<Routine>
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
