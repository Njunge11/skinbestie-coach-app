// Fake repository for unit testing (follows TESTING.md)

import {
  type SkincareRoutine,
  type SkincareRoutineProduct,
} from "@/lib/db/schema";

// Derive types from centralized schema
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

export function makeRoutineRepoFake() {
  const routineStore = new Map<string, Routine>();
  const productStore = new Map<string, RoutineProduct>();
  let routineIdCounter = 0;
  let productIdCounter = 0;

  return {
    async findById(routineId: string): Promise<Routine | null> {
      return routineStore.get(routineId) || null;
    },

    async findByUserId(userId: string): Promise<Routine | null> {
      return (
        Array.from(routineStore.values()).find(
          (r) => r.userProfileId === userId,
        ) || null
      );
    },

    async create(routine: NewRoutine): Promise<Routine> {
      const id = `routine_${++routineIdCounter}`;
      const now = new Date();
      const newRoutine: Routine = {
        ...routine,
        id,
        createdAt: now,
        updatedAt: now,
      };
      routineStore.set(id, newRoutine);
      return newRoutine;
    },

    async update(
      routineId: string,
      updates: Partial<Routine>,
    ): Promise<Routine | null> {
      const routine = routineStore.get(routineId);
      if (!routine) return null;

      Object.assign(routine, updates);
      return routine;
    },

    async deleteById(routineId: string): Promise<Routine | null> {
      const routine = routineStore.get(routineId);
      if (!routine) return null;

      routineStore.delete(routineId);
      return routine;
    },

    /**
     * Creates a routine from a template with all products (for testing).
     * Simulates the transactional behavior of the real repo.
     */
    async createRoutineFromTemplate(
      routineData: NewRoutine,
      products: NewRoutineProductInput[],
      timestamp: Date,
    ): Promise<{ routine: Routine; products: RoutineProduct[] }> {
      // Create routine
      const routineId = `routine_${++routineIdCounter}`;
      const newRoutine: Routine = {
        ...routineData,
        id: routineId,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      routineStore.set(routineId, newRoutine);

      // Create products
      const createdProducts: RoutineProduct[] = products.map((product) => {
        const productId = `product_${++productIdCounter}`;
        const newProduct: RoutineProduct = {
          ...product,
          id: productId,
          routineId: routineId,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        productStore.set(productId, newProduct);
        return newProduct;
      });

      return {
        routine: newRoutine,
        products: createdProducts,
      };
    },

    // Test helpers to inspect state
    _routineStore: routineStore,
    _productStore: productStore,
  };
}
