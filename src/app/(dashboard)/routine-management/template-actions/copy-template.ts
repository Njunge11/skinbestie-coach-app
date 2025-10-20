"use server";

import { z } from "zod";
import { makeTemplateRepo } from "./template.repo";
import { makeRoutineRepo } from "@/app/(dashboard)/subscribers/[id]/routine-info-actions/routine.repo";
import { db } from "@/lib/db";
import { skincareRoutineProducts } from "@/lib/db/schema";
import type { Routine } from "@/app/(dashboard)/subscribers/[id]/routine-info-actions/routine.repo.fake";

// Type for routine product
type RoutineProduct = {
  id: string;
  routineId: string;
  userProfileId: string;
  routineStep: string;
  productName: string;
  productUrl: string | null;
  instructions: string;
  frequency: string;
  days: string[] | null;
  timeOfDay: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

// Dependency injection for testing (follows TESTING.md)
export type CopyTemplateDeps = {
  templateRepo: ReturnType<typeof makeTemplateRepo>;
  routineRepo: ReturnType<typeof makeRoutineRepo>;
  createRoutineProduct: (data: Omit<RoutineProduct, 'id'>) => Promise<RoutineProduct>;
  now: () => Date;
};

// Default dependencies (production)
const defaultDeps: CopyTemplateDeps = {
  templateRepo: makeTemplateRepo(),
  routineRepo: makeRoutineRepo(),
  createRoutineProduct: async (data) => {
    const [newProduct] = await db
      .insert(skincareRoutineProducts)
      .values(data)
      .returning();
    return newProduct as RoutineProduct;
  },
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
  deps: CopyTemplateDeps = defaultDeps
): Promise<Result<{ routine: Routine; products: RoutineProduct[] }>> {
  const { templateRepo, routineRepo, createRoutineProduct, now } = deps;

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
    // 1. Fetch template
    const template = await templateRepo.findById(validation.data.templateId);
    if (!template) {
      return { success: false, error: "Template not found" };
    }

    // 2. Check if user already has a routine
    const existingRoutine = await routineRepo.findByUserId(validation.data.userId);
    if (existingRoutine) {
      return { success: false, error: "User already has a routine" };
    }

    // 3. Fetch all template products
    const templateProducts = await templateRepo.findProductsByTemplateId(validation.data.templateId);

    const timestamp = now();

    // 4. Create new routine for user
    const newRoutine = await routineRepo.create({
      userProfileId: validation.data.userId,
      name: validation.data.name,
      startDate: validation.data.startDate,
      endDate: validation.data.endDate || null,
      status: "draft",
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    // 5. Copy all products to new routine
    const copiedProducts: RoutineProduct[] = [];

    for (const templateProduct of templateProducts) {
      const newProduct = await createRoutineProduct({
        routineId: newRoutine.id,
        userProfileId: validation.data.userId,
        routineStep: templateProduct.routineStep,
        productName: templateProduct.productName,
        productUrl: templateProduct.productUrl,
        instructions: templateProduct.instructions,
        frequency: templateProduct.frequency,
        days: templateProduct.days,
        timeOfDay: templateProduct.timeOfDay,
        order: templateProduct.order,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      copiedProducts.push(newProduct);
    }

    return {
      success: true,
      data: {
        routine: newRoutine,
        products: copiedProducts,
      },
    };
  } catch (error) {
    console.error("Error copying template:", error);
    return { success: false, error: "Failed to copy template" };
  }
}
