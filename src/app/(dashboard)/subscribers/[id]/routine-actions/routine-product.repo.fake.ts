// Fake repository for unit testing (follows TESTING.md)

import { type SkincareRoutineProduct } from "@/lib/db/schema";

// Derive types from centralized schema
export type RoutineProduct = Pick<
  SkincareRoutineProduct,
  | "id"
  | "routineId"
  | "userProfileId"
  | "routineStep"
  | "productName"
  | "productUrl"
  | "instructions"
  | "frequency"
  | "days"
  | "timeOfDay"
  | "order"
  | "productPurchaseInstructions"
  | "createdAt"
  | "updatedAt"
>;

export type NewRoutineProduct = Omit<
  RoutineProduct,
  "id" | "createdAt" | "updatedAt"
>;

export function makeRoutineProductRepoFake() {
  const productStore = new Map<string, RoutineProduct>();
  let idCounter = 0;

  return {
    async findByUserId(userId: string): Promise<RoutineProduct[]> {
      return Array.from(productStore.values())
        .filter((p) => p.userProfileId === userId)
        .sort((a, b) => {
          if (a.timeOfDay !== b.timeOfDay) {
            return a.timeOfDay === "morning" ? -1 : 1;
          }
          return a.order - b.order;
        });
    },

    async findByRoutineId(routineId: string): Promise<RoutineProduct[]> {
      return Array.from(productStore.values())
        .filter((p) => p.routineId === routineId)
        .sort((a, b) => {
          if (a.timeOfDay !== b.timeOfDay) {
            return a.timeOfDay === "morning" ? -1 : 1;
          }
          return a.order - b.order;
        });
    },

    async findByUserIdAndTimeOfDay(
      userId: string,
      timeOfDay: "morning" | "evening",
    ): Promise<RoutineProduct[]> {
      return Array.from(productStore.values())
        .filter((p) => p.userProfileId === userId && p.timeOfDay === timeOfDay)
        .sort((a, b) => a.order - b.order);
    },

    async findById(productId: string): Promise<RoutineProduct | null> {
      return productStore.get(productId) || null;
    },

    async findByIds(productIds: string[]): Promise<RoutineProduct[]> {
      return productIds
        .map((id) => productStore.get(id))
        .filter((p): p is RoutineProduct => p !== undefined);
    },

    async create(product: NewRoutineProduct): Promise<RoutineProduct> {
      const id = `product_${++idCounter}`;
      const now = new Date();
      const newProduct: RoutineProduct = {
        ...product,
        id,
        createdAt: now,
        updatedAt: now,
      };
      productStore.set(id, newProduct);
      return newProduct;
    },

    async update(
      productId: string,
      updates: Partial<RoutineProduct>,
    ): Promise<RoutineProduct | null> {
      const product = productStore.get(productId);
      if (!product) return null;

      Object.assign(product, updates);
      return product;
    },

    async deleteById(productId: string): Promise<RoutineProduct | null> {
      const product = productStore.get(productId);
      if (!product) return null;

      productStore.delete(productId);
      return product;
    },

    async updateMany(
      updates: Array<{ id: string; data: Partial<RoutineProduct> }>,
    ): Promise<void> {
      for (const { id, data } of updates) {
        const product = productStore.get(id);
        if (product) {
          productStore.set(id, { ...product, ...data });
        }
      }
    },

    // Test helper to inspect state
    _productStore: productStore,
  };
}
