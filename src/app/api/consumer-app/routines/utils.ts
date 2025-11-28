import { db } from "@/lib/db";
import { skincareRoutines, userProfiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Verify that a routine belongs to a specific user
 * @param routineId - The routine ID
 * @param userId - The auth user ID (from users table)
 * @returns true if the routine belongs to the user, false otherwise
 */
export async function verifyRoutineOwnership(
  routineId: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .select({ id: skincareRoutines.id })
    .from(skincareRoutines)
    .innerJoin(
      userProfiles,
      eq(skincareRoutines.userProfileId, userProfiles.id),
    )
    .where(
      and(eq(skincareRoutines.id, routineId), eq(userProfiles.userId, userId)),
    )
    .limit(1);

  return result.length > 0;
}
