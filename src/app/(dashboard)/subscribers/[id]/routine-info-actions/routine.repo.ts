// Real repository using Drizzle ORM (production)

import { eq } from "drizzle-orm";
import { db as defaultDb, type DrizzleDB } from "@/lib/db";
import { skincareRoutines, type SkincareRoutine } from "@/lib/db/schema";

// Type definitions derived from schema
export type Routine = Pick<
  SkincareRoutine,
  | "id"
  | "userProfileId"
  | "name"
  | "startDate"
  | "endDate"
  | "status"
  | "savedAsTemplate"
  | "createdAt"
  | "updatedAt"
>;

export type NewRoutine = Omit<Routine, "id" | "createdAt" | "updatedAt">;

export function makeRoutineRepo({ db = defaultDb }: { db?: DrizzleDB } = {}) {
  return {
    async findById(routineId: string) {
      const [routine] = await db
        .select({
          id: skincareRoutines.id,
          userProfileId: skincareRoutines.userProfileId,
          name: skincareRoutines.name,
          startDate: skincareRoutines.startDate,
          endDate: skincareRoutines.endDate,
          status: skincareRoutines.status,
          savedAsTemplate: skincareRoutines.savedAsTemplate,
          createdAt: skincareRoutines.createdAt,
          updatedAt: skincareRoutines.updatedAt,
        })
        .from(skincareRoutines)
        .where(eq(skincareRoutines.id, routineId))
        .limit(1);

      return routine ? (routine as Routine) : null;
    },

    async findByUserId(userId: string) {
      try {
        const [routine] = await db
          .select({
            id: skincareRoutines.id,
            userProfileId: skincareRoutines.userProfileId,
            name: skincareRoutines.name,
            startDate: skincareRoutines.startDate,
            endDate: skincareRoutines.endDate,
            status: skincareRoutines.status,
            savedAsTemplate: skincareRoutines.savedAsTemplate,
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

    async create(routine: NewRoutine) {
      const [newRoutine] = await db
        .insert(skincareRoutines)
        .values(routine)
        .returning();

      return newRoutine as Routine;
    },

    async update(routineId: string, updates: Partial<Routine>) {
      const [updatedRoutine] = await db
        .update(skincareRoutines)
        .set(updates)
        .where(eq(skincareRoutines.id, routineId))
        .returning();

      return updatedRoutine ? (updatedRoutine as Routine) : null;
    },

    async deleteById(routineId: string) {
      const [deletedRoutine] = await db
        .delete(skincareRoutines)
        .where(eq(skincareRoutines.id, routineId))
        .returning();

      return deletedRoutine ? (deletedRoutine as Routine) : null;
    },
  };
}
