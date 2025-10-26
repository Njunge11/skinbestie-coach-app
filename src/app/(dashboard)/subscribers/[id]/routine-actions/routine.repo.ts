// Real repository using Drizzle ORM (production)

import { eq, asc, and, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { skincareRoutineProducts } from "@/lib/db/schema";
import type { RoutineProduct, NewRoutineProduct } from "./routine.repo.fake";

export function makeRoutineProductsRepo() {
  return {
    async findByUserId(userId: string): Promise<RoutineProduct[]> {
      const products = await db
        .select({
          id: skincareRoutineProducts.id,
          routineId: skincareRoutineProducts.routineId,
          userProfileId: skincareRoutineProducts.userProfileId,
          routineStep: skincareRoutineProducts.routineStep,
          productName: skincareRoutineProducts.productName,
          productUrl: skincareRoutineProducts.productUrl,
          instructions: skincareRoutineProducts.instructions,
          frequency: skincareRoutineProducts.frequency,
          days: skincareRoutineProducts.days,
          timeOfDay: skincareRoutineProducts.timeOfDay,
          order: skincareRoutineProducts.order,
          createdAt: skincareRoutineProducts.createdAt,
          updatedAt: skincareRoutineProducts.updatedAt,
        })
        .from(skincareRoutineProducts)
        .where(eq(skincareRoutineProducts.userProfileId, userId))
        .orderBy(asc(skincareRoutineProducts.timeOfDay), asc(skincareRoutineProducts.order))
        .execute();

      return products as RoutineProduct[];
    },

    async findByUserIdAndTimeOfDay(
      userId: string,
      timeOfDay: "morning" | "evening"
    ): Promise<RoutineProduct[]> {
      const products = await db
        .select({
          id: skincareRoutineProducts.id,
          routineId: skincareRoutineProducts.routineId,
          userProfileId: skincareRoutineProducts.userProfileId,
          routineStep: skincareRoutineProducts.routineStep,
          productName: skincareRoutineProducts.productName,
          productUrl: skincareRoutineProducts.productUrl,
          instructions: skincareRoutineProducts.instructions,
          frequency: skincareRoutineProducts.frequency,
          days: skincareRoutineProducts.days,
          timeOfDay: skincareRoutineProducts.timeOfDay,
          order: skincareRoutineProducts.order,
          createdAt: skincareRoutineProducts.createdAt,
          updatedAt: skincareRoutineProducts.updatedAt,
        })
        .from(skincareRoutineProducts)
        .where(
          and(
            eq(skincareRoutineProducts.userProfileId, userId),
            eq(skincareRoutineProducts.timeOfDay, timeOfDay)
          )
        )
        .orderBy(asc(skincareRoutineProducts.order))
        .execute();

      return products as RoutineProduct[];
    },

    async findById(productId: string): Promise<RoutineProduct | null> {
      const [product] = await db
        .select({
          id: skincareRoutineProducts.id,
          routineId: skincareRoutineProducts.routineId,
          userProfileId: skincareRoutineProducts.userProfileId,
          routineStep: skincareRoutineProducts.routineStep,
          productName: skincareRoutineProducts.productName,
          productUrl: skincareRoutineProducts.productUrl,
          instructions: skincareRoutineProducts.instructions,
          frequency: skincareRoutineProducts.frequency,
          days: skincareRoutineProducts.days,
          timeOfDay: skincareRoutineProducts.timeOfDay,
          order: skincareRoutineProducts.order,
          createdAt: skincareRoutineProducts.createdAt,
          updatedAt: skincareRoutineProducts.updatedAt,
        })
        .from(skincareRoutineProducts)
        .where(eq(skincareRoutineProducts.id, productId))
        .limit(1)
        .execute();

      return product ? (product as RoutineProduct) : null;
    },

    async findByIds(productIds: string[]): Promise<RoutineProduct[]> {
      if (productIds.length === 0) return [];

      const products = await db
        .select({
          id: skincareRoutineProducts.id,
          routineId: skincareRoutineProducts.routineId,
          userProfileId: skincareRoutineProducts.userProfileId,
          routineStep: skincareRoutineProducts.routineStep,
          productName: skincareRoutineProducts.productName,
          productUrl: skincareRoutineProducts.productUrl,
          instructions: skincareRoutineProducts.instructions,
          frequency: skincareRoutineProducts.frequency,
          days: skincareRoutineProducts.days,
          timeOfDay: skincareRoutineProducts.timeOfDay,
          order: skincareRoutineProducts.order,
          createdAt: skincareRoutineProducts.createdAt,
          updatedAt: skincareRoutineProducts.updatedAt,
        })
        .from(skincareRoutineProducts)
        .where(inArray(skincareRoutineProducts.id, productIds))
        .execute();

      return products as RoutineProduct[];
    },

    async create(product: NewRoutineProduct): Promise<RoutineProduct> {
      const [newProduct] = await db
        .insert(skincareRoutineProducts)
        .values(product)
        .returning();

      return newProduct as RoutineProduct;
    },

    async update(
      productId: string,
      updates: Partial<RoutineProduct>
    ): Promise<RoutineProduct | null> {
      const [updatedProduct] = await db
        .update(skincareRoutineProducts)
        .set(updates)
        .where(eq(skincareRoutineProducts.id, productId))
        .returning();

      return updatedProduct ? (updatedProduct as RoutineProduct) : null;
    },

    async deleteById(productId: string): Promise<RoutineProduct | null> {
      const [deletedProduct] = await db
        .delete(skincareRoutineProducts)
        .where(eq(skincareRoutineProducts.id, productId))
        .returning();

      return deletedProduct ? (deletedProduct as RoutineProduct) : null;
    },

    async updateMany(
      updates: Array<{ id: string; data: Partial<RoutineProduct> }>
    ): Promise<void> {
      if (updates.length === 0) return;

      // Use transaction - constraint is DEFERRABLE so we can update in one pass
      await db.transaction(async (tx) => {
        // Build CASE statements for batch update
        const ids = updates.map((u) => `'${u.id}'`).join(", ");

        const orderCases = updates
          .map((u) => `WHEN '${u.id}' THEN ${u.data.order}`)
          .join(" ");

        const updatedAtCases = updates
          .map((u) => `WHEN '${u.id}' THEN '${u.data.updatedAt?.toISOString()}'`)
          .join(" ");

        // Single batch UPDATE query - constraint check deferred to commit
        await tx.execute(sql.raw(`
          UPDATE skincare_routine_products
          SET
            "order" = (CASE id ${orderCases} END),
            updated_at = (CASE id ${updatedAtCases} END)::timestamp
          WHERE id IN (${ids})
        `));
      });
    },
  };
}
