// Real repository using Drizzle ORM (production)

import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { routineTemplates, routineTemplateProducts } from "@/lib/db/schema";
import type {
  RoutineTemplate,
  NewRoutineTemplate,
  RoutineTemplateProduct,
  NewRoutineTemplateProduct,
} from "./template.repo.fake";

export function makeTemplateRepo() {
  return {
    // Template CRUD
    async findAll(): Promise<RoutineTemplate[]> {
      const templates = await db
        .select()
        .from(routineTemplates)
        .orderBy(desc(routineTemplates.createdAt))
        .execute();

      return templates as RoutineTemplate[];
    },

    async findById(templateId: string): Promise<RoutineTemplate | null> {
      const [template] = await db
        .select()
        .from(routineTemplates)
        .where(eq(routineTemplates.id, templateId))
        .limit(1)
        .execute();

      return template ? (template as RoutineTemplate) : null;
    },

    async create(template: NewRoutineTemplate): Promise<RoutineTemplate> {
      const [newTemplate] = await db
        .insert(routineTemplates)
        .values(template)
        .returning();

      return newTemplate as RoutineTemplate;
    },

    async update(
      templateId: string,
      updates: Partial<RoutineTemplate>
    ): Promise<RoutineTemplate | null> {
      const [updatedTemplate] = await db
        .update(routineTemplates)
        .set(updates)
        .where(eq(routineTemplates.id, templateId))
        .returning();

      return updatedTemplate ? (updatedTemplate as RoutineTemplate) : null;
    },

    async deleteById(templateId: string): Promise<RoutineTemplate | null> {
      const [deletedTemplate] = await db
        .delete(routineTemplates)
        .where(eq(routineTemplates.id, templateId))
        .returning();

      return deletedTemplate ? (deletedTemplate as RoutineTemplate) : null;
    },

    // Template Product CRUD
    async findProductsByTemplateId(
      templateId: string
    ): Promise<RoutineTemplateProduct[]> {
      const products = await db
        .select()
        .from(routineTemplateProducts)
        .where(eq(routineTemplateProducts.templateId, templateId))
        .execute();

      // Sort by timeOfDay (morning first) and then by order
      return (products as RoutineTemplateProduct[]).sort((a, b) => {
        if (a.timeOfDay !== b.timeOfDay) {
          return a.timeOfDay === "morning" ? -1 : 1;
        }
        return a.order - b.order;
      });
    },

    async findProductById(
      productId: string
    ): Promise<RoutineTemplateProduct | null> {
      const [product] = await db
        .select()
        .from(routineTemplateProducts)
        .where(eq(routineTemplateProducts.id, productId))
        .limit(1)
        .execute();

      return product ? (product as RoutineTemplateProduct) : null;
    },

    async createProduct(
      product: NewRoutineTemplateProduct
    ): Promise<RoutineTemplateProduct> {
      const [newProduct] = await db
        .insert(routineTemplateProducts)
        .values(product)
        .returning();

      return newProduct as RoutineTemplateProduct;
    },

    async updateProduct(
      productId: string,
      updates: Partial<RoutineTemplateProduct>
    ): Promise<RoutineTemplateProduct | null> {
      const [updatedProduct] = await db
        .update(routineTemplateProducts)
        .set(updates)
        .where(eq(routineTemplateProducts.id, productId))
        .returning();

      return updatedProduct ? (updatedProduct as RoutineTemplateProduct) : null;
    },

    async deleteProductById(
      productId: string
    ): Promise<RoutineTemplateProduct | null> {
      const [deletedProduct] = await db
        .delete(routineTemplateProducts)
        .where(eq(routineTemplateProducts.id, productId))
        .returning();

      return deletedProduct ? (deletedProduct as RoutineTemplateProduct) : null;
    },

    async updateManyProducts(
      updates: Array<{ id: string; data: Partial<RoutineTemplateProduct> }>
    ): Promise<void> {
      // To avoid unique constraint violations on (templateId, timeOfDay, order),
      // we first set all products to temporary negative order values,
      // then update to final order values

      // Step 1: Set all products to temporary negative orders
      for (let i = 0; i < updates.length; i++) {
        const { id, data } = updates[i];
        await db
          .update(routineTemplateProducts)
          .set({ order: -(i + 1), updatedAt: data.updatedAt })
          .where(eq(routineTemplateProducts.id, id));
      }

      // Step 2: Set final order values
      for (const { id, data } of updates) {
        await db
          .update(routineTemplateProducts)
          .set(data)
          .where(eq(routineTemplateProducts.id, id));
      }
    },
  };
}
