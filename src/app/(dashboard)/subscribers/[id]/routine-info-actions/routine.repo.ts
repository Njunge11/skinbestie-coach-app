// Real repository using Drizzle ORM (production)

import { eq } from "drizzle-orm";
import { db as defaultDb, type DrizzleDB } from "@/lib/db";
import {
  skincareRoutines,
  skincareRoutineProducts,
  type SkincareRoutine,
  type SkincareRoutineProduct,
} from "@/lib/db/schema";

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

export type RoutineProduct = Pick<
  SkincareRoutineProduct,
  | "id"
  | "routineId"
  | "userProfileId"
  | "stepType"
  | "stepName"
  | "routineStep"
  | "productName"
  | "productUrl"
  | "instructions"
  | "productPurchaseInstructions"
  | "frequency"
  | "days"
  | "timeOfDay"
  | "order"
  | "createdAt"
  | "updatedAt"
>;

export type NewRoutineProduct = Omit<
  RoutineProduct,
  "id" | "createdAt" | "updatedAt"
>;

export type NewRoutineProductInput = Omit<
  RoutineProduct,
  "id" | "routineId" | "createdAt" | "updatedAt"
>;

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

    /**
     * Creates a routine from a template with all products in an atomic transaction.
     * This ensures that either the entire operation succeeds or fails together.
     */
    async createRoutineFromTemplate(
      routineData: NewRoutine,
      products: NewRoutineProductInput[],
      timestamp: Date,
    ): Promise<{ routine: Routine; products: RoutineProduct[] }> {
      // Use transaction to ensure atomicity
      const result = await db.transaction(async (tx) => {
        // Create new routine
        const [newRoutine] = await tx
          .insert(skincareRoutines)
          .values({
            ...routineData,
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          .returning();

        if (!newRoutine) {
          throw new Error("Failed to create routine");
        }

        // Batch insert all products
        const productValues = products.map((product) => ({
          ...product,
          routineId: newRoutine.id,
          createdAt: timestamp,
          updatedAt: timestamp,
        }));

        const copiedProducts = await tx
          .insert(skincareRoutineProducts)
          .values(productValues)
          .returning();

        return {
          routine: newRoutine as Routine,
          products: copiedProducts as RoutineProduct[],
        };
      });

      return result;
    },
  };
}
