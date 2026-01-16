// Real repository using Drizzle ORM (production)

import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  routineTemplates,
  routineTemplateProducts,
  type RoutineTemplate as RoutineTemplateBase,
  type RoutineTemplateProduct as RoutineTemplateProductBase,
} from "@/lib/db/schema";

// Define types (same as fake repo, derived from centralized schema)
export type RoutineTemplate = Pick<
  RoutineTemplateBase,
  "id" | "name" | "description" | "createdBy" | "createdAt" | "updatedAt"
>;

export type NewRoutineTemplate = Omit<RoutineTemplate, "id">;

export type RoutineTemplateProduct = Pick<
  RoutineTemplateProductBase,
  | "id"
  | "templateId"
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

export type NewRoutineTemplateProduct = Omit<RoutineTemplateProduct, "id">;

export function makeTemplateRepo() {
  return {
    // Template CRUD
    async findAll(): Promise<RoutineTemplate[]> {
      const templates = await db
        .select({
          id: routineTemplates.id,
          name: routineTemplates.name,
          description: routineTemplates.description,
          createdBy: routineTemplates.createdBy,
          createdAt: routineTemplates.createdAt,
          updatedAt: routineTemplates.updatedAt,
        })
        .from(routineTemplates)
        .orderBy(desc(routineTemplates.createdAt))
        .execute();

      return templates as RoutineTemplate[];
    },

    async findById(templateId: string): Promise<RoutineTemplate | null> {
      const [template] = await db
        .select({
          id: routineTemplates.id,
          name: routineTemplates.name,
          description: routineTemplates.description,
          createdBy: routineTemplates.createdBy,
          createdAt: routineTemplates.createdAt,
          updatedAt: routineTemplates.updatedAt,
        })
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
      updates: Partial<RoutineTemplate>,
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
      templateId: string,
    ): Promise<RoutineTemplateProduct[]> {
      const products = await db
        .select({
          id: routineTemplateProducts.id,
          templateId: routineTemplateProducts.templateId,
          stepType: routineTemplateProducts.stepType,
          stepName: routineTemplateProducts.stepName,
          routineStep: routineTemplateProducts.routineStep,
          productName: routineTemplateProducts.productName,
          productUrl: routineTemplateProducts.productUrl,
          instructions: routineTemplateProducts.instructions,
          productPurchaseInstructions:
            routineTemplateProducts.productPurchaseInstructions,
          frequency: routineTemplateProducts.frequency,
          days: routineTemplateProducts.days,
          timeOfDay: routineTemplateProducts.timeOfDay,
          order: routineTemplateProducts.order,
          createdAt: routineTemplateProducts.createdAt,
          updatedAt: routineTemplateProducts.updatedAt,
        })
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
      productId: string,
    ): Promise<RoutineTemplateProduct | null> {
      const [product] = await db
        .select({
          id: routineTemplateProducts.id,
          templateId: routineTemplateProducts.templateId,
          stepType: routineTemplateProducts.stepType,
          stepName: routineTemplateProducts.stepName,
          routineStep: routineTemplateProducts.routineStep,
          productName: routineTemplateProducts.productName,
          productUrl: routineTemplateProducts.productUrl,
          instructions: routineTemplateProducts.instructions,
          productPurchaseInstructions:
            routineTemplateProducts.productPurchaseInstructions,
          frequency: routineTemplateProducts.frequency,
          days: routineTemplateProducts.days,
          timeOfDay: routineTemplateProducts.timeOfDay,
          order: routineTemplateProducts.order,
          createdAt: routineTemplateProducts.createdAt,
          updatedAt: routineTemplateProducts.updatedAt,
        })
        .from(routineTemplateProducts)
        .where(eq(routineTemplateProducts.id, productId))
        .limit(1)
        .execute();

      return product ? (product as RoutineTemplateProduct) : null;
    },

    async createProduct(
      product: NewRoutineTemplateProduct,
    ): Promise<RoutineTemplateProduct> {
      const [newProduct] = await db
        .insert(routineTemplateProducts)
        .values(product)
        .returning();

      return newProduct as RoutineTemplateProduct;
    },

    async updateProduct(
      productId: string,
      updates: Partial<RoutineTemplateProduct>,
    ): Promise<RoutineTemplateProduct | null> {
      const [updatedProduct] = await db
        .update(routineTemplateProducts)
        .set(updates)
        .where(eq(routineTemplateProducts.id, productId))
        .returning();

      return updatedProduct ? (updatedProduct as RoutineTemplateProduct) : null;
    },

    async deleteProductById(
      productId: string,
    ): Promise<RoutineTemplateProduct | null> {
      const [deletedProduct] = await db
        .delete(routineTemplateProducts)
        .where(eq(routineTemplateProducts.id, productId))
        .returning();

      return deletedProduct ? (deletedProduct as RoutineTemplateProduct) : null;
    },

    async updateManyProducts(
      updates: Array<{ id: string; data: Partial<RoutineTemplateProduct> }>,
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
          .map(
            (u) => `WHEN '${u.id}' THEN '${u.data.updatedAt?.toISOString()}'`,
          )
          .join(" ");

        // Single batch UPDATE query - constraint check deferred to commit
        await tx.execute(
          sql.raw(`
          UPDATE routine_template_products
          SET
            "order" = (CASE id ${orderCases} END),
            updated_at = (CASE id ${updatedAtCases} END)::timestamp
          WHERE id IN (${ids})
        `),
        );
      });
    },
  };
}
