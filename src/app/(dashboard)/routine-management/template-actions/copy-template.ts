"use server";

import { z } from "zod";
import { makeTemplateRepo } from "./template.repo";
import {
  makeRoutineRepo,
  type Routine,
} from "@/app/(dashboard)/subscribers/[id]/routine-info-actions/routine.repo";
import { db } from "@/lib/db";
import { skincareRoutineProducts, skincareRoutines } from "@/lib/db/schema";

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
    // (Read-only operations, failure here doesn't corrupt data)
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

    // Wrap ONLY write operations in transaction for atomicity
    const result = await db.transaction(async (tx) => {
      const timestamp = now();

      // Create new routine using tx directly (not repo)
      // CRITICAL: Must use tx, not routineRepo.create() which uses global db
      const [newRoutine] = await tx
        .insert(skincareRoutines)
        .values({
          userProfileId: validation.data.userId,
          name: validation.data.name,
          startDate: validation.data.startDate,
          endDate: validation.data.endDate || null,
          status: "draft",
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();

      if (!newRoutine) {
        throw new Error("Failed to create routine");
      }

      // Batch insert all products atomically using tx
      // This is more efficient than N individual INSERTs
      const productValues = templateProducts.map((templateProduct) => ({
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
      }));

      // Single batch INSERT - much faster than N individual INSERTs
      const copiedProducts = await tx
        .insert(skincareRoutineProducts)
        .values(productValues)
        .returning();

      return {
        routine: newRoutine as Routine,
        products: copiedProducts as RoutineProduct[],
      };
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error copying template:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to copy template";
    return { success: false, error: errorMessage };
  }
}
