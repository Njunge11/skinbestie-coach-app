"use server";

import { z } from "zod";
import { makeRoutineProductsRepo } from "./routine.repo";
import type { RoutineProduct, NewRoutineProduct } from "./routine.repo.fake";

// Dependency injection for testing (follows TESTING.md)
export type RoutineProductDeps = {
  repo: ReturnType<typeof makeRoutineProductsRepo>;
  now: () => Date;
};

// Default dependencies (production)
const defaultDeps: RoutineProductDeps = {
  repo: makeRoutineProductsRepo(),
  now: () => new Date(),
};

// Result types
type SuccessResult<T> = { success: true; data: T };
type ErrorResult = { success: false; error: string };
type Result<T> = SuccessResult<T> | ErrorResult;

// Input types
export type CreateRoutineProductInput = {
  routineId: string;
  routineStep: string;
  productName: string;
  productUrl?: string;
  instructions: string;
  frequency: string;
  days?: string[];
  timeOfDay: "morning" | "evening";
};

export type UpdateRoutineProductInput = {
  routineStep?: string;
  productName?: string;
  productUrl?: string;
  instructions?: string;
  frequency?: string;
  days?: string[];
};

// Zod schemas for validation
const uuidSchema = z.string().uuid();
const requiredStringSchema = z.string().trim().min(1);
const timeOfDaySchema = z.enum(["morning", "evening"]);

const createRoutineProductSchema = z.object({
  userId: uuidSchema,
  routineId: uuidSchema,
  routineStep: requiredStringSchema,
  productName: requiredStringSchema,
  productUrl: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().url().nullable().optional()
  ),
  instructions: requiredStringSchema,
  frequency: requiredStringSchema,
  days: z.array(z.string()).nullable().optional(),
  timeOfDay: timeOfDaySchema,
});

const updateRoutineProductSchema = z.object({
  productId: uuidSchema,
  routineStep: z.string().trim().min(1).optional(),
  productName: z.string().trim().min(1).optional(),
  productUrl: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().url().nullable().optional()
  ),
  instructions: z.string().trim().min(1).optional(),
  frequency: z.string().trim().min(1).optional(),
  days: z.array(z.string()).nullable().optional(),
});

const deleteRoutineProductSchema = z.object({
  productId: uuidSchema,
});

const reorderRoutineProductsSchema = z.object({
  userId: uuidSchema,
  timeOfDay: timeOfDaySchema,
  productIds: z.array(uuidSchema).min(1),
});

/**
 * Get all routine products for a user, ordered by timeOfDay then order
 */
export async function getRoutineProducts(
  userId: string,
  deps: RoutineProductDeps = defaultDeps
): Promise<Result<RoutineProduct[]>> {
  const { repo } = deps;

  // Validate userId with Zod
  const validation = uuidSchema.safeParse(userId);
  if (!validation.success) {
    return { success: false, error: "Invalid user ID" };
  }

  try {
    // Fetch products from repo
    const products = await repo.findByUserId(validation.data);
    return { success: true, data: products };
  } catch (error) {
    console.error("Error fetching routine products:", error);
    return { success: false, error: "Failed to fetch routine products" };
  }
}

/**
 * Get routine products for a user filtered by time of day
 */
export async function getRoutineProductsByTimeOfDay(
  userId: string,
  timeOfDay: "morning" | "evening",
  deps: RoutineProductDeps = defaultDeps
): Promise<Result<RoutineProduct[]>> {
  const { repo } = deps;

  // Validate input with Zod
  const validation = z
    .object({
      userId: uuidSchema,
      timeOfDay: timeOfDaySchema,
    })
    .safeParse({ userId, timeOfDay });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Fetch products from repo
    const products = await repo.findByUserIdAndTimeOfDay(
      validation.data.userId,
      validation.data.timeOfDay
    );
    return { success: true, data: products };
  } catch (error) {
    console.error("Error fetching routine products by time of day:", error);
    return { success: false, error: "Failed to fetch routine products" };
  }
}

/**
 * Create a new routine product for a user
 */
export async function createRoutineProduct(
  userId: string,
  input: CreateRoutineProductInput,
  deps: RoutineProductDeps = defaultDeps
): Promise<Result<RoutineProduct>> {
  const { repo, now } = deps;

  // Validate input with Zod
  const validation = createRoutineProductSchema.safeParse({
    userId,
    ...input,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Get existing products for this time of day to determine order
    const existingProducts = await repo.findByUserIdAndTimeOfDay(
      validation.data.userId,
      validation.data.timeOfDay
    );

    // Calculate order (max order + 1, or 0 if no products)
    const order =
      existingProducts.length > 0
        ? Math.max(...existingProducts.map((p) => p.order)) + 1
        : 0;

    const timestamp = now();

    // Create product with validated data (already trimmed by Zod)
    const newProduct: NewRoutineProduct = {
      routineId: validation.data.routineId,
      userProfileId: validation.data.userId,
      routineStep: validation.data.routineStep,
      productName: validation.data.productName,
      productUrl: validation.data.productUrl ?? undefined,
      instructions: validation.data.instructions,
      frequency: validation.data.frequency,
      days: validation.data.days ?? undefined,
      timeOfDay: validation.data.timeOfDay,
      order,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const product = await repo.create(newProduct);
    return { success: true, data: product };
  } catch (error) {
    console.error("Error creating routine product:", error);
    return { success: false, error: "Failed to create routine product" };
  }
}

/**
 * Update an existing routine product
 */
export async function updateRoutineProduct(
  productId: string,
  updates: UpdateRoutineProductInput,
  deps: RoutineProductDeps = defaultDeps
): Promise<Result<void>> {
  const { repo, now } = deps;

  // Validate input with Zod
  const validation = updateRoutineProductSchema.safeParse({
    productId,
    ...updates,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Build update data with validated fields (already trimmed by Zod)
    const updateData: Partial<RoutineProduct> = {
      updatedAt: now(),
    };

    if (validation.data.routineStep !== undefined) {
      updateData.routineStep = validation.data.routineStep;
    }

    if (validation.data.productName !== undefined) {
      updateData.productName = validation.data.productName;
    }

    if (validation.data.productUrl !== undefined) {
      updateData.productUrl = validation.data.productUrl ?? undefined;
    }

    if (validation.data.instructions !== undefined) {
      updateData.instructions = validation.data.instructions;
    }

    if (validation.data.frequency !== undefined) {
      updateData.frequency = validation.data.frequency;
    }

    if (validation.data.days !== undefined) {
      updateData.days = validation.data.days ?? undefined;
    }

    // Update product
    const updatedProduct = await repo.update(
      validation.data.productId,
      updateData
    );

    if (!updatedProduct) {
      return { success: false, error: "Routine product not found" };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error updating routine product:", error);
    return { success: false, error: "Failed to update routine product" };
  }
}

/**
 * Delete a routine product
 */
export async function deleteRoutineProduct(
  productId: string,
  deps: RoutineProductDeps = defaultDeps
): Promise<Result<void>> {
  const { repo } = deps;

  // Validate input with Zod
  const validation = deleteRoutineProductSchema.safeParse({ productId });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Delete product
    const deletedProduct = await repo.deleteById(validation.data.productId);

    if (!deletedProduct) {
      return { success: false, error: "Routine product not found" };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error deleting routine product:", error);
    return { success: false, error: "Failed to delete routine product" };
  }
}

/**
 * Reorder routine products by updating their order values
 * Only affects products for the specified timeOfDay
 */
export async function reorderRoutineProducts(
  userId: string,
  timeOfDay: "morning" | "evening",
  reorderedProductIds: string[],
  deps: RoutineProductDeps = defaultDeps
): Promise<Result<void>> {
  const { repo, now } = deps;

  // Validate input with Zod
  const validation = reorderRoutineProductsSchema.safeParse({
    userId,
    timeOfDay,
    productIds: reorderedProductIds,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    const timestamp = now();

    // Build updates for each product
    const updates = validation.data.productIds.map((id, index) => ({
      id,
      data: {
        order: index,
        updatedAt: timestamp,
      },
    }));

    // Update all products in batch
    await repo.updateMany(updates);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error reordering routine products:", error);
    return { success: false, error: "Failed to reorder routine products" };
  }
}
