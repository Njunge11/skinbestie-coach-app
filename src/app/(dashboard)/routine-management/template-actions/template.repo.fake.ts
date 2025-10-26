// Fake repository for unit testing (follows TESTING.md)

export type RoutineTemplate = {
  id: string;
  name: string;
  description: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NewRoutineTemplate = Omit<RoutineTemplate, 'id'>;

export type RoutineTemplateProduct = {
  id: string;
  templateId: string;
  routineStep: string;
  productName: string;
  productUrl: string | null;
  instructions: string;
  frequency: "daily" | "2x per week" | "3x per week" | "specific_days";
  days: string[] | null;
  timeOfDay: 'morning' | 'evening';
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

export type NewRoutineTemplateProduct = Omit<RoutineTemplateProduct, 'id'>;

export function makeTemplateRepoFake() {
  const templateStore = new Map<string, RoutineTemplate>();
  const productStore = new Map<string, RoutineTemplateProduct>();
  let templateIdCounter = 0;
  let productIdCounter = 0;

  return {
    // Template CRUD
    async findAll(): Promise<RoutineTemplate[]> {
      return Array.from(templateStore.values()).sort((a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime()
      );
    },

    async findById(templateId: string): Promise<RoutineTemplate | null> {
      return templateStore.get(templateId) || null;
    },

    async create(template: NewRoutineTemplate): Promise<RoutineTemplate> {
      const id = `template_${++templateIdCounter}`;
      const newTemplate: RoutineTemplate = { ...template, id };
      templateStore.set(id, newTemplate);
      return newTemplate;
    },

    async update(templateId: string, updates: Partial<RoutineTemplate>): Promise<RoutineTemplate | null> {
      const template = templateStore.get(templateId);
      if (!template) return null;

      Object.assign(template, updates);
      return template;
    },

    async deleteById(templateId: string): Promise<RoutineTemplate | null> {
      const template = templateStore.get(templateId);
      if (!template) return null;

      // Cascade delete products
      const products = Array.from(productStore.values()).filter(p => p.templateId === templateId);
      products.forEach(p => productStore.delete(p.id));

      templateStore.delete(templateId);
      return template;
    },

    // Template Product CRUD
    async findProductsByTemplateId(templateId: string): Promise<RoutineTemplateProduct[]> {
      return Array.from(productStore.values())
        .filter(p => p.templateId === templateId)
        .sort((a, b) => {
          if (a.timeOfDay !== b.timeOfDay) {
            return a.timeOfDay === 'morning' ? -1 : 1;
          }
          return a.order - b.order;
        });
    },

    async findProductById(productId: string): Promise<RoutineTemplateProduct | null> {
      return productStore.get(productId) || null;
    },

    async createProduct(product: NewRoutineTemplateProduct): Promise<RoutineTemplateProduct> {
      const id = `product_${++productIdCounter}`;
      const newProduct: RoutineTemplateProduct = { ...product, id };
      productStore.set(id, newProduct);
      return newProduct;
    },

    async updateProduct(productId: string, updates: Partial<RoutineTemplateProduct>): Promise<RoutineTemplateProduct | null> {
      const product = productStore.get(productId);
      if (!product) return null;

      Object.assign(product, updates);
      return product;
    },

    async deleteProductById(productId: string): Promise<RoutineTemplateProduct | null> {
      const product = productStore.get(productId);
      if (!product) return null;

      productStore.delete(productId);
      return product;
    },

    async updateManyProducts(
      updates: Array<{ id: string; data: Partial<RoutineTemplateProduct> }>
    ): Promise<void> {
      for (const { id, data } of updates) {
        const product = productStore.get(id);
        if (product) {
          productStore.set(id, { ...product, ...data });
        }
      }
    },

    // Test helpers to inspect state
    _templateStore: templateStore,
    _productStore: productStore,
  };
}
