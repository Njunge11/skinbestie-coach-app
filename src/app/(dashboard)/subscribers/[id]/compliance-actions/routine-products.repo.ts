/**
 * Real repository for skincare routine products using Drizzle ORM
 */

import { db } from "@/lib/db";
import { skincareRoutineProducts } from "@/lib/db/schema";
import { type SkincareRoutineProductRow } from "@/lib/db/types";
import { eq, asc } from "drizzle-orm";

// Derive type from centralized schema (TYPE_SYSTEM_GUIDE.md)
export type RoutineProduct = Pick<
  SkincareRoutineProductRow,
  | "id"
  | "routineId"
  | "userProfileId"
  | "routineStep"
  | "productName"
  | "instructions"
  | "frequency"
  | "days"
  | "timeOfDay"
>;

export function makeRoutineProductsRepo() {
  return {
    /**
     * Find all products for a routine
     */
    async findByRoutineId(routineId: string): Promise<RoutineProduct[]> {
      const results = await db
        .select({
          id: skincareRoutineProducts.id,
          routineId: skincareRoutineProducts.routineId,
          userProfileId: skincareRoutineProducts.userProfileId,
          routineStep: skincareRoutineProducts.routineStep,
          productName: skincareRoutineProducts.productName,
          instructions: skincareRoutineProducts.instructions,
          frequency: skincareRoutineProducts.frequency,
          days: skincareRoutineProducts.days,
          timeOfDay: skincareRoutineProducts.timeOfDay,
        })
        .from(skincareRoutineProducts)
        .where(eq(skincareRoutineProducts.routineId, routineId))
        .orderBy(asc(skincareRoutineProducts.order));

      return results as RoutineProduct[];
    },
  };
}
