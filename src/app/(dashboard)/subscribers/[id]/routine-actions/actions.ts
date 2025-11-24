"use server";

import { z } from "zod";
import { makeRoutineProductsRepo } from "./routine.repo";
import type { RoutineProduct, NewRoutineProduct } from "./routine.repo";
import { makeRoutineRepo as makeRoutineInfoRepo } from "../routine-info-actions/routine.repo";
import { deleteScheduledStepsForProduct } from "../compliance-actions/actions";
import { db } from "@/lib/db";
import {
  skincareRoutineProducts,
  routineStepCompletions,
} from "@/lib/db/schema";
import { eq, and, asc, gte, inArray } from "drizzle-orm";
import { makeUserProfileRepo } from "../compliance-actions/user-profile.repo";
import {
  calculateDeadlines,
  shouldGenerateForDate,
} from "@/lib/compliance-utils";
import { addMonths, addDays } from "date-fns";

// Dependency injection for testing (follows TESTING.md)
export type RoutineProductDeps = {
  repo: ReturnType<typeof makeRoutineProductsRepo>;
  now: () => Date;
};

// Extended deps for createRoutineProduct with regeneration
export type CreateRoutineProductWithRegenerationDeps = RoutineProductDeps & {
  routineRepo: {
    findById: (id: string) => Promise<{
      id: string;
      userProfileId: string;
      status: "draft" | "published";
      startDate: Date;
      endDate: Date | null;
    } | null>;
  };
};

// Extended deps for updateRoutineProduct with regeneration
export type UpdateRoutineProductWithRegenerationDeps = RoutineProductDeps & {
  routineRepo: {
    findById: (id: string) => Promise<{
      id: string;
      userProfileId: string;
      status: "draft" | "published";
      startDate: Date;
      endDate: Date | null;
    } | null>;
  };
};

// Extended deps for deleteRoutineProduct with cleanup
export type DeleteRoutineProductWithCleanupDeps = RoutineProductDeps & {
  routineRepo: {
    findById: (id: string) => Promise<{
      id: string;
      status: "draft" | "published";
    } | null>;
  };
  deleteScheduledStepsForProduct: typeof deleteScheduledStepsForProduct;
};

// Default dependencies (production)
const defaultDeps: RoutineProductDeps = {
  repo: makeRoutineProductsRepo(),
  now: () => new Date(),
};

// Default dependencies with regeneration for createRoutineProduct (production)
const defaultDepsWithRegeneration: CreateRoutineProductWithRegenerationDeps = {
  repo: makeRoutineProductsRepo(),
  routineRepo: makeRoutineInfoRepo(),
  now: () => new Date(),
};

// Default dependencies with regeneration for updateRoutineProduct (production)
const defaultUpdateDepsWithRegeneration: UpdateRoutineProductWithRegenerationDeps =
  {
    repo: makeRoutineProductsRepo(),
    routineRepo: makeRoutineInfoRepo(),
    now: () => new Date(),
  };

// Default dependencies with cleanup for deleteRoutineProduct (production)
const defaultDeleteDepsWithCleanup: DeleteRoutineProductWithCleanupDeps = {
  repo: makeRoutineProductsRepo(),
  routineRepo: makeRoutineInfoRepo(),
  deleteScheduledStepsForProduct,
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
  productUrl: string | null;
  instructions?: string | null;
  frequency: string;
  days: string[] | null;
  timeOfDay: "morning" | "evening";
};

export type UpdateRoutineProductInput = {
  routineStep?: string;
  productName?: string;
  productUrl?: string | null;
  instructions?: string | null;
  frequency?: string;
  days?: string[] | null;
};

// Zod schemas for validation
const uuidSchema = z.string().uuid();
const requiredStringSchema = z.string().trim().min(1);
const timeOfDaySchema = z.enum(["morning", "evening"]);
const routineStepSchema = z.enum([
  "Cleanse",
  "Treat",
  "Protect",
  "Moisturise",
  "Eye cream",
  "Toner",
  "Essence",
  "Pimple patch",
  "Lip care",
]);

const createRoutineProductSchema = z.object({
  userId: uuidSchema,
  routineId: uuidSchema,
  routineStep: routineStepSchema,
  productName: requiredStringSchema,
  productUrl: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().url().nullable(),
  ),
  instructions: z.string().nullable().optional(),
  productPurchaseInstructions: z
    .preprocess((val) => (val === "" ? null : val), z.string().nullable())
    .optional(),
  frequency: z.enum([
    "daily",
    "1x per week",
    "2x per week",
    "3x per week",
    "4x per week",
    "5x per week",
    "6x per week",
    "specific_days",
  ]),
  days: z.array(z.string()).nullable(),
  timeOfDay: timeOfDaySchema,
});

const updateRoutineProductSchema = z.object({
  productId: uuidSchema,
  routineStep: routineStepSchema.optional(),
  productName: z.string().trim().min(1).optional(),
  productUrl: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().url().nullable().optional(),
  ),
  instructions: z.string().trim().min(1).optional(),
  frequency: z
    .enum([
      "daily",
      "2x per week",
      "3x per week",
      "4x per week",
      "5x per week",
      "6x per week",
      "specific_days",
    ])
    .optional(),
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
  deps: RoutineProductDeps = defaultDeps,
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
  deps: RoutineProductDeps = defaultDeps,
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
      validation.data.timeOfDay,
    );
    return { success: true, data: products };
  } catch (error) {
    console.error("Error fetching routine products by time of day:", error);
    return { success: false, error: "Failed to fetch routine products" };
  }
}

/**
 * Create a new routine product
 *
 * TRANSACTION FIX: Previously product creation was in a transaction but
 * step generation was outside, causing data integrity issues if step generation failed.
 *
 * FIX: Inline step generation SQL into the same transaction as product creation.
 */
export async function createRoutineProduct(
  userId: string,
  input: CreateRoutineProductInput,
  deps: CreateRoutineProductWithRegenerationDeps = defaultDepsWithRegeneration,
): Promise<Result<RoutineProduct>> {
  const { routineRepo } = deps;

  // Validate input with Zod
  const validation = createRoutineProductSchema.safeParse({
    userId,
    ...input,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Fetch routine BEFORE transaction (read-only)
    const routine = await routineRepo.findById(validation.data.routineId);
    if (!routine) {
      return { success: false, error: "Routine not found" };
    }

    // Prepare step generation data if routine is published
    let completionsToCreate: Array<{
      routineProductId: string;
      userProfileId: string;
      scheduledDate: Date;
      scheduledTimeOfDay: "morning" | "evening";
      onTimeDeadline: Date;
      gracePeriodEnd: Date;
      completedAt: null;
      status: "pending";
    }> = [];

    if (routine.status === "published") {
      // Fetch user for timezone
      const userRepo = makeUserProfileRepo();
      const user = await userRepo.findById(validation.data.userId);
      if (!user) {
        return { success: false, error: "User profile not found" };
      }

      // We'll generate the product ID inside the transaction and set it later
    }

    // CRITICAL: Product creation AND step generation in ONE transaction
    const product = await db.transaction(async (tx) => {
      // Get existing products for this time of day to determine order
      const existingProducts = await tx
        .select()
        .from(skincareRoutineProducts)
        .where(
          and(
            eq(skincareRoutineProducts.userProfileId, validation.data.userId),
            eq(skincareRoutineProducts.timeOfDay, validation.data.timeOfDay),
          ),
        )
        .orderBy(asc(skincareRoutineProducts.order));

      // Calculate order (max order + 1, or 0 if no products)
      const order =
        existingProducts.length > 0
          ? Math.max(...existingProducts.map((p) => p.order)) + 1
          : 0;

      // Create product with validated data (already trimmed by Zod)
      const newProduct: NewRoutineProduct = {
        routineId: validation.data.routineId,
        userProfileId: validation.data.userId,
        routineStep: validation.data.routineStep,
        productName: validation.data.productName,
        productUrl: validation.data.productUrl ?? null,
        instructions: validation.data.instructions ?? null,
        productPurchaseInstructions:
          validation.data.productPurchaseInstructions ?? null,
        frequency: validation.data.frequency,
        days: validation.data.days ?? null,
        timeOfDay: validation.data.timeOfDay,
        order,
      };

      // Create product using tx (transaction object)
      const [createdProduct] = await tx
        .insert(skincareRoutineProducts)
        .values(newProduct)
        .returning();

      // If routine is published, generate scheduled steps in SAME transaction
      if (routine.status === "published") {
        const userRepo = makeUserProfileRepo();
        const user = await userRepo.findById(validation.data.userId);
        if (!user) {
          throw new Error("User profile not found");
        }

        // Calculate scheduled steps from today onwards
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = routine.endDate ?? addMonths(today, 6);

        completionsToCreate = [];
        let currentDate = new Date(today);

        while (currentDate <= endDate) {
          if (
            shouldGenerateForDate(
              {
                frequency: validation.data.frequency,
                days: validation.data.days ?? undefined,
              },
              currentDate,
            )
          ) {
            const { onTimeDeadline, gracePeriodEnd } = calculateDeadlines(
              currentDate,
              validation.data.timeOfDay,
              user.timezone,
            );

            completionsToCreate.push({
              routineProductId: createdProduct.id,
              userProfileId: validation.data.userId,
              scheduledDate: new Date(currentDate),
              scheduledTimeOfDay: validation.data.timeOfDay,
              onTimeDeadline,
              gracePeriodEnd,
              completedAt: null,
              status: "pending" as const,
            });
          }
          currentDate = addDays(currentDate, 1);
        }

        // Insert all scheduled steps using tx
        if (completionsToCreate.length > 0) {
          await tx.insert(routineStepCompletions).values(completionsToCreate);
        }
      }

      return createdProduct as RoutineProduct;
    });

    return { success: true, data: product };
  } catch (error) {
    console.error("Error creating routine product:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create routine product";
    return { success: false, error: errorMessage };
  }
}

/**
 * Update an existing routine product
 *
 * TRANSACTION FIX: Previously product update and step deletion were in a transaction
 * but step regeneration was outside, causing data integrity issues if regeneration failed.
 *
 * FIX: Inline step regeneration SQL into the same transaction as update/delete.
 */
export async function updateRoutineProduct(
  productId: string,
  updates: UpdateRoutineProductInput,
  deps: UpdateRoutineProductWithRegenerationDeps = defaultUpdateDepsWithRegeneration,
): Promise<Result<void>> {
  const { routineRepo, now } = deps;

  // Validate input with Zod
  const validation = updateRoutineProductSchema.safeParse({
    productId,
    ...updates,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // CRITICAL: Update, delete, AND regenerate in ONE transaction
    await db.transaction(async (tx) => {
      // Get the product first to access routineId and userProfileId
      const [product] = await tx
        .select()
        .from(skincareRoutineProducts)
        .where(eq(skincareRoutineProducts.id, validation.data.productId))
        .limit(1);

      if (!product) {
        throw new Error("Routine product not found");
      }

      // Check if routine exists and get its status
      const routine = await routineRepo.findById(product.routineId);
      if (!routine) {
        throw new Error("Routine not found");
      }

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

      // Update product using tx (transaction object)
      const [updatedProduct] = await tx
        .update(skincareRoutineProducts)
        .set(updateData)
        .where(eq(skincareRoutineProducts.id, validation.data.productId))
        .returning();

      if (!updatedProduct) {
        throw new Error("Routine product not found");
      }

      // If routine is published, delete old steps and regenerate in SAME transaction
      if (routine.status === "published") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Delete pending and missed steps from today onwards using tx
        await tx
          .delete(routineStepCompletions)
          .where(
            and(
              eq(routineStepCompletions.routineProductId, product.id),
              gte(routineStepCompletions.scheduledDate, today),
              inArray(routineStepCompletions.status, ["pending", "missed"]),
            ),
          )
          .returning();

        // Regenerate steps inline in SAME transaction
        const userRepo = makeUserProfileRepo();
        const user = await userRepo.findById(product.userProfileId);
        if (!user) {
          throw new Error("User profile not found");
        }

        // Calculate end date
        const endDate = routine.endDate ?? addMonths(today, 6);

        // Generate new completion records
        const completionsToCreate = [];
        let currentDate = new Date(today);

        while (currentDate <= endDate) {
          if (
            shouldGenerateForDate(
              {
                frequency: updatedProduct.frequency,
                days: updatedProduct.days ?? undefined,
              },
              currentDate,
            )
          ) {
            const { onTimeDeadline, gracePeriodEnd } = calculateDeadlines(
              currentDate,
              updatedProduct.timeOfDay as "morning" | "evening",
              user.timezone,
            );

            completionsToCreate.push({
              routineProductId: updatedProduct.id,
              userProfileId: product.userProfileId,
              scheduledDate: new Date(currentDate),
              scheduledTimeOfDay: updatedProduct.timeOfDay as
                | "morning"
                | "evening",
              onTimeDeadline,
              gracePeriodEnd,
              completedAt: null,
              status: "pending" as const,
            });
          }
          currentDate = addDays(currentDate, 1);
        }

        // Insert new scheduled steps using tx
        if (completionsToCreate.length > 0) {
          await tx.insert(routineStepCompletions).values(completionsToCreate);
        }
      }
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error updating routine product:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to update routine product";
    return { success: false, error: errorMessage };
  }
}

/**
 * Delete a routine product
 */
export async function deleteRoutineProduct(
  productId: string,
  deps: DeleteRoutineProductWithCleanupDeps = defaultDeleteDepsWithCleanup,
): Promise<Result<void>> {
  const { routineRepo } = deps;

  // Validate input with Zod
  const validation = deleteRoutineProductSchema.safeParse({ productId });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Wrap entire operation in transaction for atomicity
    await db.transaction(async (tx) => {
      // Get the product first to access routineId and userProfileId
      const [product] = await tx
        .select()
        .from(skincareRoutineProducts)
        .where(eq(skincareRoutineProducts.id, validation.data.productId))
        .limit(1);

      if (!product) {
        throw new Error("Routine product not found");
      }

      // Check if routine exists and get its status (read-only, not critical if outside tx)
      const routine = await routineRepo.findById(product.routineId);
      if (!routine) {
        throw new Error("Routine not found");
      }

      // If routine is published, cleanup scheduled steps first
      // CRITICAL: Use tx to delete steps, NOT the helper function which uses global db
      if (routine.status === "published") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Delete pending and missed steps from today onwards using tx
        await tx
          .delete(routineStepCompletions)
          .where(
            and(
              eq(routineStepCompletions.routineProductId, product.id),
              gte(routineStepCompletions.scheduledDate, today),
              inArray(routineStepCompletions.status, ["pending", "missed"]),
            ),
          )
          .returning();
      }

      // Delete product using tx (transaction object)
      const [deletedProduct] = await tx
        .delete(skincareRoutineProducts)
        .where(eq(skincareRoutineProducts.id, validation.data.productId))
        .returning();

      if (!deletedProduct) {
        throw new Error("Routine product not found");
      }
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error deleting routine product:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to delete routine product";
    return { success: false, error: errorMessage };
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
  deps: RoutineProductDeps = defaultDeps,
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
