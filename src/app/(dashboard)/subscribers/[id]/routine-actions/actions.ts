"use server";

import { makeRoutineProductsRepo } from "./routine.repo";
import type { RoutineProduct, NewRoutineProduct } from "./routine.repo.fake";

// Dependency injection for testing (follows TESTING.md)
export type RoutineProductDeps = {
  repo: ReturnType<typeof makeRoutineProductsRepo>;
  now: () => Date;
  validateId?: (id: string) => boolean;
};

// Default dependencies (production)
const defaultDeps: RoutineProductDeps = {
  repo: makeRoutineProductsRepo(),
  now: () => new Date(),
  validateId: isValidUUID,
};

// Result types
type SuccessResult<T> = { success: true; data: T };
type ErrorResult = { success: false; error: string };
type Result<T> = SuccessResult<T> | ErrorResult;

// Input types
export type CreateRoutineProductInput = {
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

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Get all routine products for a user, ordered by timeOfDay then order
 */
export async function getRoutineProducts(
  userId: string,
  deps: RoutineProductDeps = defaultDeps
): Promise<Result<RoutineProduct[]>> {
  const { repo, validateId = isValidUUID } = deps;

  // Validate userId
  if (!validateId(userId)) {
    return { success: false, error: "Invalid user ID" };
  }

  // Fetch products from repo
  const products = await repo.findByUserId(userId);

  return { success: true, data: products };
}

/**
 * Get routine products for a user filtered by time of day
 */
export async function getRoutineProductsByTimeOfDay(
  userId: string,
  timeOfDay: "morning" | "evening",
  deps: RoutineProductDeps = defaultDeps
): Promise<Result<RoutineProduct[]>> {
  const { repo, validateId = isValidUUID } = deps;

  // Validate userId
  if (!validateId(userId)) {
    return { success: false, error: "Invalid data" };
  }

  // Fetch products from repo
  const products = await repo.findByUserIdAndTimeOfDay(userId, timeOfDay);

  return { success: true, data: products };
}

/**
 * Create a new routine product for a user
 */
export async function createRoutineProduct(
  userId: string,
  input: CreateRoutineProductInput,
  deps: RoutineProductDeps = defaultDeps
): Promise<Result<RoutineProduct>> {
  const { repo, now, validateId = isValidUUID } = deps;

  // Validate userId
  if (!validateId(userId)) {
    return { success: false, error: "Invalid data" };
  }

  // Validate input - all required fields
  if (!input.routineStep || input.routineStep.trim() === "") {
    return { success: false, error: "Invalid data" };
  }
  if (!input.productName || input.productName.trim() === "") {
    return { success: false, error: "Invalid data" };
  }
  if (!input.instructions || input.instructions.trim() === "") {
    return { success: false, error: "Invalid data" };
  }
  if (!input.frequency || input.frequency.trim() === "") {
    return { success: false, error: "Invalid data" };
  }
  if (!input.timeOfDay || (input.timeOfDay !== "morning" && input.timeOfDay !== "evening")) {
    return { success: false, error: "Invalid data" };
  }

  // Get existing products for this time of day to determine order
  const existingProducts = await repo.findByUserIdAndTimeOfDay(userId, input.timeOfDay);

  // Calculate order (max order + 1, or 0 if no products)
  const order = existingProducts.length > 0
    ? Math.max(...existingProducts.map((p) => p.order)) + 1
    : 0;

  const timestamp = now();

  // Create product
  const newProduct: NewRoutineProduct = {
    userProfileId: userId,
    routineStep: input.routineStep,
    productName: input.productName,
    productUrl: input.productUrl,
    instructions: input.instructions,
    frequency: input.frequency,
    days: input.days,
    timeOfDay: input.timeOfDay,
    order,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const product = await repo.create(newProduct);

  return { success: true, data: product };
}

/**
 * Update an existing routine product
 */
export async function updateRoutineProduct(
  productId: string,
  updates: UpdateRoutineProductInput,
  deps: RoutineProductDeps = defaultDeps
): Promise<Result<void>> {
  const { repo, now, validateId = isValidUUID } = deps;

  // Validate productId
  if (!validateId(productId)) {
    return { success: false, error: "Invalid data" };
  }

  // Validate updates - required fields cannot be empty
  if (updates.routineStep !== undefined && updates.routineStep.trim() === "") {
    return { success: false, error: "Invalid data" };
  }
  if (updates.productName !== undefined && updates.productName.trim() === "") {
    return { success: false, error: "Invalid data" };
  }
  if (updates.instructions !== undefined && updates.instructions.trim() === "") {
    return { success: false, error: "Invalid data" };
  }
  if (updates.frequency !== undefined && updates.frequency.trim() === "") {
    return { success: false, error: "Invalid data" };
  }

  // Build update data
  const updateData: Partial<RoutineProduct> = {
    updatedAt: now(),
  };

  if (updates.routineStep !== undefined) {
    updateData.routineStep = updates.routineStep;
  }

  if (updates.productName !== undefined) {
    updateData.productName = updates.productName;
  }

  if (updates.productUrl !== undefined) {
    updateData.productUrl = updates.productUrl;
  }

  if (updates.instructions !== undefined) {
    updateData.instructions = updates.instructions;
  }

  if (updates.frequency !== undefined) {
    updateData.frequency = updates.frequency;
  }

  if (updates.days !== undefined) {
    updateData.days = updates.days;
  }

  // Update product
  const updatedProduct = await repo.update(productId, updateData);

  if (!updatedProduct) {
    return { success: false, error: "Routine product not found" };
  }

  return { success: true, data: undefined };
}

/**
 * Delete a routine product
 */
export async function deleteRoutineProduct(
  productId: string,
  deps: RoutineProductDeps = defaultDeps
): Promise<Result<void>> {
  const { repo, validateId = isValidUUID } = deps;

  // Validate productId
  if (!validateId(productId)) {
    return { success: false, error: "Invalid data" };
  }

  // Delete product
  const deletedProduct = await repo.deleteById(productId);

  if (!deletedProduct) {
    return { success: false, error: "Routine product not found" };
  }

  return { success: true, data: undefined };
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
  const { repo, now, validateId = isValidUUID } = deps;

  // Validate userId
  if (!validateId(userId)) {
    return { success: false, error: "Invalid data" };
  }

  // Validate productIds array
  if (!reorderedProductIds || reorderedProductIds.length === 0) {
    return { success: false, error: "Invalid data" };
  }

  const timestamp = now();

  // Build updates for each product
  const updates = reorderedProductIds.map((id, index) => ({
    id,
    data: {
      order: index,
      updatedAt: timestamp,
    },
  }));

  // Update all products in batch
  await repo.updateMany(updates);

  return { success: true, data: undefined };
}
