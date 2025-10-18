/**
 * Real repository for skincare routine products using Drizzle ORM
 */

import { db } from "@/lib/db";
import { skincareRoutineProducts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type RoutineProduct = {
  id: string;
  routineId: string;
  userProfileId: string;
  routineStep: string;
  productName: string;
  instructions: string;
  frequency: string;
  days?: string[];
  timeOfDay: "morning" | "evening";
};

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
        .orderBy(skincareRoutineProducts.order);

      return results as RoutineProduct[];
    },
  };
}
