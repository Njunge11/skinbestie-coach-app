/**
 * Real repository for skincare routines using Drizzle ORM
 */

import { db } from "@/lib/db";
import { skincareRoutines, type SkincareRoutine } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Derive type from centralized schema (TYPE_SYSTEM_GUIDE.md)
export type Routine = Pick<
  SkincareRoutine,
  "id" | "userProfileId" | "name" | "startDate" | "endDate"
>;

export function makeRoutineRepo() {
  return {
    /**
     * Find a routine by ID
     */
    async findById(id: string): Promise<Routine | null> {
      const [result] = await db
        .select({
          id: skincareRoutines.id,
          userProfileId: skincareRoutines.userProfileId,
          name: skincareRoutines.name,
          startDate: skincareRoutines.startDate,
          endDate: skincareRoutines.endDate,
        })
        .from(skincareRoutines)
        .where(eq(skincareRoutines.id, id))
        .limit(1);

      return (result as Routine) ?? null;
    },
  };
}
