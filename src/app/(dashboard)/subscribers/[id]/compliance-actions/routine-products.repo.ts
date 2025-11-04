/**
 * Real repository for skincare routine products using Drizzle ORM
 */

import { db as defaultDb, type DrizzleDB } from "@/lib/db";
import {
  skincareRoutineProducts,
  type SkincareRoutineProduct,
} from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

// Derive type from centralized schema (TYPE_SYSTEM_GUIDE.md)
export type RoutineProduct = Pick<
  SkincareRoutineProduct,
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

export function makeRoutineProductsRepo({
  db = defaultDb,
}: { db?: DrizzleDB } = {}) {
  return {
    /**
     * Find a product by ID
     */
    async findById(id: string) {
      const [result] = await db
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
        .where(eq(skincareRoutineProducts.id, id))
        .limit(1);

      return (result as RoutineProduct) ?? null;
    },

    /**
     * Find all products for a routine
     */
    async findByRoutineId(routineId: string) {
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
