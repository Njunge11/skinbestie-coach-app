"use server";

import { z } from "zod";
import { makeRoutineRepo } from "./routine.repo";
import { makeTemplateRepo } from "@/app/(dashboard)/routine-management/template-actions/template.repo";
import { makeRoutineProductsRepo } from "../routine-actions/routine.repo";

// Default dependencies (production)
const defaultDeps = {
  routineRepo: makeRoutineRepo(),
  templateRepo: makeTemplateRepo(),
  productRepo: makeRoutineProductsRepo(),
  now: () => new Date(),
};

// Dependency injection types (for testing)
export type SaveAsTemplateDeps = typeof defaultDeps;

const saveAsTemplateSchema = z.object({
  routineId: z.string().uuid(),
  adminId: z.string().uuid(),
});

export async function saveRoutineAsTemplate(
  routineId: string,
  adminId: string,
  deps: SaveAsTemplateDeps = defaultDeps,
) {
  const { routineRepo, templateRepo, productRepo, now } = deps;

  // Validate input
  const validation = saveAsTemplateSchema.safeParse({ routineId, adminId });
  if (!validation.success) {
    return { success: false as const, error: "Invalid data" };
  }

  try {
    // 1. Get routine
    const routine = await routineRepo.findById(routineId);
    if (!routine) {
      return { success: false as const, error: "Routine not found" };
    }

    // 2. Check if routine is published
    if (routine.status !== "published") {
      return {
        success: false as const,
        error: "Only published routines can be saved as templates",
      };
    }

    // 3. Check if already saved as template
    if (routine.savedAsTemplate) {
      return {
        success: false as const,
        error: "This routine has already been saved as a template",
      };
    }

    // 4. Get products
    const products = await productRepo.findByRoutineId(routineId);
    if (products.length === 0) {
      return {
        success: false as const,
        error: "Cannot save routine with no products as template",
      };
    }

    const timestamp = now();

    // 5. Create template
    const template = await templateRepo.create({
      name: routine.name,
      description: null,
      createdBy: adminId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    // 6. Copy products to template
    for (const product of products) {
      await templateRepo.createProduct({
        templateId: template.id,
        stepType: product.stepType,
        stepName: product.stepName,
        routineStep: product.routineStep,
        productName: product.productName,
        productUrl: product.productUrl,
        instructions: product.instructions,
        productPurchaseInstructions: product.productPurchaseInstructions,
        frequency: product.frequency,
        days: product.days,
        timeOfDay: product.timeOfDay,
        order: product.order,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    // 7. Mark routine as saved
    await routineRepo.update(routineId, {
      savedAsTemplate: true,
      updatedAt: timestamp,
    });

    return { success: true as const };
  } catch (error) {
    console.error("Error saving routine as template:", error);

    if (error instanceof Error) {
      return { success: false as const, error: error.message };
    }

    return {
      success: false as const,
      error: "Failed to save routine as template",
    };
  }
}
