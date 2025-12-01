"use server";

import { z } from "zod";
import { makeTemplateRepo } from "./template.repo";
import {
  makeRoutineRepo,
  type Routine,
  type RoutineProduct,
  type NewRoutineProductInput,
} from "@/app/(dashboard)/subscribers/[id]/routine-info-actions/routine.repo";

// Dependency injection for testing (follows TESTING.md)
export type CopyTemplateDeps = {
  templateRepo: ReturnType<typeof makeTemplateRepo>;
  routineRepo: ReturnType<typeof makeRoutineRepo>;
  now: () => Date;
};

// Default dependencies (production)
const defaultDeps: CopyTemplateDeps = {
  templateRepo: makeTemplateRepo(),
  routineRepo: makeRoutineRepo(),
  now: () => new Date(),
};

// Result types
type SuccessResult<T> = { success: true; data: T };
type ErrorResult = { success: false; error: string };
type Result<T> = SuccessResult<T> | ErrorResult;

// Input types
export type CopyTemplateInput = {
  name: string;
  startDate: Date;
  endDate?: Date | null;
};

// Zod schemas for validation
const uuidSchema = z.string().uuid();
const requiredStringSchema = z.string().trim().min(1);
const dateSchema = z.coerce.date();

const copyTemplateSchema = z.object({
  templateId: uuidSchema,
  userId: uuidSchema,
  name: requiredStringSchema,
  startDate: dateSchema,
  endDate: dateSchema.nullable().optional(),
});

/**
 * Copy a template to create a new routine for a user
 * This creates:
 * 1. A new routine for the user with custom name and dates
 * 2. Copies of all template products linked to the new routine
 */
export async function copyTemplateToUser(
  templateId: string,
  userId: string,
  input: CopyTemplateInput,
  deps: CopyTemplateDeps = defaultDeps,
): Promise<Result<{ routine: Routine; products: RoutineProduct[] }>> {
  const { templateRepo, routineRepo, now } = deps;

  // Validate input with Zod
  const validation = copyTemplateSchema.safeParse({
    templateId,
    userId,
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Fetch template and validate BEFORE transaction
    const template = await templateRepo.findById(validation.data.templateId);
    if (!template) {
      return { success: false, error: "Template not found" };
    }

    // Check if user already has a routine BEFORE transaction
    const existingRoutine = await routineRepo.findByUserId(
      validation.data.userId,
    );
    if (existingRoutine) {
      return { success: false, error: "User already has a routine" };
    }

    // Fetch all template products BEFORE transaction
    const templateProducts = await templateRepo.findProductsByTemplateId(
      validation.data.templateId,
    );

    // Prepare routine data
    const timestamp = now();
    const routineData = {
      userProfileId: validation.data.userId,
      name: validation.data.name,
      startDate: validation.data.startDate,
      endDate: validation.data.endDate || null,
      status: "draft" as const,
      savedAsTemplate: false,
    };

    // Prepare product data - map template products to routine products
    // CRITICAL: Preserve ALL fields including stepType, stepName, productPurchaseInstructions
    const productData: NewRoutineProductInput[] = templateProducts.map(
      (templateProduct) => ({
        userProfileId: validation.data.userId,
        stepType: templateProduct.stepType,
        stepName: templateProduct.stepName,
        routineStep: templateProduct.routineStep,
        productName: templateProduct.productName,
        productUrl: templateProduct.productUrl,
        instructions: templateProduct.instructions,
        productPurchaseInstructions:
          templateProduct.productPurchaseInstructions,
        frequency: templateProduct.frequency,
        days: templateProduct.days,
        timeOfDay: templateProduct.timeOfDay,
        order: templateProduct.order,
      }),
    );

    // Use repo method which handles transaction internally
    const result = await routineRepo.createRoutineFromTemplate(
      routineData,
      productData,
      timestamp,
    );

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error copying template:", error);
    return { success: false, error: "Failed to copy template" };
  }
}
