// Real repository using Drizzle ORM (production)

import { eq, asc, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { skincareRoutineProducts } from "@/lib/db/schema";
import type { RoutineProduct, NewRoutineProduct } from "./routine.repo.fake";

export function makeRoutineProductsRepo() {
  return {
    async findByUserId(userId: string): Promise<RoutineProduct[]> {
      const products = await db
        .select()
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
        .select()
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
        .select()
        .from(skincareRoutineProducts)
        .where(eq(skincareRoutineProducts.id, productId))
        .limit(1)
        .execute();

      return product ? (product as RoutineProduct) : null;
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
      // To avoid unique constraint violations on (userProfileId, timeOfDay, order),
      // we first set all products to temporary negative order values,
      // then update to final order values

      // Step 1: Set all products to temporary negative orders
      for (let i = 0; i < updates.length; i++) {
        const { id, data } = updates[i];
        await db
          .update(skincareRoutineProducts)
          .set({ order: -(i + 1), updatedAt: data.updatedAt })
          .where(eq(skincareRoutineProducts.id, id));
      }

      // Step 2: Set final order values
      for (const { id, data } of updates) {
        await db
          .update(skincareRoutineProducts)
          .set(data)
          .where(eq(skincareRoutineProducts.id, id));
      }
    },
  };
}
