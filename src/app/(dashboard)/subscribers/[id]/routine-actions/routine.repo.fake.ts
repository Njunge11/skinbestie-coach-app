// Fake repository using in-memory Map (for testing)

export interface RoutineProduct {
  id: string;
  routineId: string;
  userProfileId: string;
  routineStep: string;
  productName: string;
  productUrl?: string;
  instructions: string;
  frequency: string;
  days?: string[];
  timeOfDay: "morning" | "evening";
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewRoutineProduct {
  routineId: string;
  userProfileId: string;
  routineStep: string;
  productName: string;
  productUrl?: string;
  instructions: string;
  frequency: string;
  days?: string[];
  timeOfDay: "morning" | "evening";
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export function makeRoutineProductsRepoFake() {
  const _store = new Map<string, RoutineProduct>();
  let _idCounter = 0;

  return {
    // Expose store for testing
    _store,

    async findByUserId(userId: string): Promise<RoutineProduct[]> {
      const products = Array.from(_store.values()).filter(
        (p) => p.userProfileId === userId
      );

      // Sort by timeOfDay (morning first) then by order
      return products.sort((a, b) => {
        if (a.timeOfDay !== b.timeOfDay) {
          return a.timeOfDay === "morning" ? -1 : 1;
        }
        return a.order - b.order;
      });
    },

    async findByUserIdAndTimeOfDay(
      userId: string,
      timeOfDay: "morning" | "evening"
    ): Promise<RoutineProduct[]> {
      const products = Array.from(_store.values()).filter(
        (p) => p.userProfileId === userId && p.timeOfDay === timeOfDay
      );

      // Sort by order
      return products.sort((a, b) => a.order - b.order);
    },

    async findById(productId: string): Promise<RoutineProduct | null> {
      return _store.get(productId) || null;
    },

    async create(product: NewRoutineProduct): Promise<RoutineProduct> {
      const id = `routine_product_${++_idCounter}`;
      const newProduct: RoutineProduct = {
        id,
        ...product,
      };
      _store.set(id, newProduct);
      return newProduct;
    },

    async update(
      productId: string,
      updates: Partial<RoutineProduct>
    ): Promise<RoutineProduct | null> {
      const product = _store.get(productId);
      if (!product) return null;

      const updated = { ...product, ...updates };
      _store.set(productId, updated);
      return updated;
    },

    async deleteById(productId: string): Promise<RoutineProduct | null> {
      const product = _store.get(productId);
      if (!product) return null;

      _store.delete(productId);
      return product;
    },

    async updateMany(
      updates: Array<{ id: string; data: Partial<RoutineProduct> }>
    ): Promise<void> {
      for (const { id, data } of updates) {
        const product = _store.get(id);
        if (product) {
          _store.set(id, { ...product, ...data });
        }
      }
    },
  };
}
