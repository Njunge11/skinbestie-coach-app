"use server";

import { db } from "@/lib/db";
import {
  routineStepCompletions,
  skincareRoutineProducts,
} from "@/lib/db/schema";
import { makeRoutineRepo } from "./routine.repo";
import {
  makeRoutineProductsRepo,
  type RoutineProduct,
} from "../compliance-actions/routine-products.repo";
import { makeUserProfileRepo } from "../compliance-actions/user-profile.repo";
import {
  makeDeadlineCache,
  shouldGenerateForDate,
} from "@/lib/compliance-utils";
import { addDays } from "date-fns";
import { eq, and, desc, inArray } from "drizzle-orm";
import type { Result } from "@/lib/result";
import { type UpdateRoutineProductInput, uuidSchema } from "./validation";
import { toMidnightUTC } from "./utils";

// Default dependencies for updateRoutineProduct
const defaultProductDeps = {
  repo: makeRoutineProductsRepo(),
  routineRepo: makeRoutineRepo(),
  userRepo: makeUserProfileRepo(),
  db: db,
  now: () => new Date(),
};

// Dependency injection for updateRoutineProduct (inferred from defaults)
export type UpdateRoutineProductDeps = typeof defaultProductDeps;

/**
 * Update a routine product (regenerates tasks if frequency/timeOfDay/days changed)
 *
 * Following the regeneration pattern from ROUTINE_COMPLETION_REGENERATION.md:
 * - Only regenerates if routine is published AND scheduling fields changed
 * - Deletes uncompleted future tasks for this product
 * - Regenerates tasks from today → today + 60 days (capped by end date)
 * - Preserves all completed tasks (on-time, late, missed)
 */
export async function updateRoutineProduct(
  productId: string,
  updates: UpdateRoutineProductInput,
  deps: UpdateRoutineProductDeps = defaultProductDeps,
): Promise<Result<RoutineProduct>> {
  const { repo, routineRepo, userRepo, db: database, now } = deps;

  try {
    // Validate productId
    const validation = uuidSchema.safeParse(productId);
    if (!validation.success) {
      return { success: false, error: "Invalid product ID" };
    }

    // Fetch product
    const product = await repo.findById(validation.data);
    if (!product) {
      return { success: false, error: "Product not found" };
    }

    // Fetch routine
    const routine = await routineRepo.findById(product.routineId);
    if (!routine) {
      return { success: false, error: "Routine not found" };
    }

    // Check if scheduling fields changed
    const schedulingFieldsChanged =
      updates.frequency !== undefined ||
      updates.timeOfDay !== undefined ||
      updates.days !== undefined;

    // Only regenerate if routine is published AND scheduling fields changed
    const shouldRegenerate =
      routine.status === "published" && schedulingFieldsChanged;

    if (shouldRegenerate) {
      // Fetch user for timezone
      const user = await userRepo.findById(routine.userProfileId);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      const today = toMidnightUTC(now());
      const routineStart = toMidnightUTC(routine.startDate);
      const effectiveStartDate = new Date(
        Math.max(routineStart.getTime(), today.getTime()),
      );

      // Calculate window end: Use existing tasks' max date or 60-day cap from effective start
      // This ensures we don't extend beyond the routine's current window when start date was updated
      const allProducts = await repo.findByRoutineId(routine.id);
      const allProductIds = allProducts.map((p) => p.id);

      let maxExistingDate: Date | null = null;
      if (allProductIds.length > 0) {
        const [maxTask] = await database
          .select({ maxDate: routineStepCompletions.scheduledDate })
          .from(routineStepCompletions)
          .where(
            inArray(routineStepCompletions.routineProductId, allProductIds),
          )
          .orderBy(desc(routineStepCompletions.scheduledDate))
          .limit(1);

        if (maxTask?.maxDate) {
          maxExistingDate = toMidnightUTC(maxTask.maxDate);
        }
      }

      const defaultWindowEnd = addDays(effectiveStartDate, 59);
      const routineEndDateNormalized = routine.endDate
        ? toMidnightUTC(routine.endDate)
        : null;

      // Priority: 1) Routine end date, 2) Existing max date, 3) 60-day window
      let endDate: Date;
      if (routineEndDateNormalized) {
        endDate = new Date(
          Math.min(
            defaultWindowEnd.getTime(),
            routineEndDateNormalized.getTime(),
          ),
        );
      } else if (maxExistingDate) {
        // Use existing window end (don't extend beyond it)
        endDate = maxExistingDate;
      } else {
        endDate = defaultWindowEnd;
      }

      // Regenerate tasks in transaction
      await database.transaction(async (tx) => {
        // 1. Delete pending tasks from effective start date onward for this product
        // This ensures we don't leave stale pending tasks before the routine's current start date
        await tx
          .delete(routineStepCompletions)
          .where(
            and(
              eq(routineStepCompletions.routineProductId, validation.data),
              eq(routineStepCompletions.status, "pending"),
            ),
          );

        // 2. Update product
        await tx
          .update(skincareRoutineProducts)
          .set({
            ...updates,
            updatedAt: now(),
          })
          .where(eq(skincareRoutineProducts.id, validation.data));

        // 3. Regenerate tasks for this product
        const updatedProduct = { ...product, ...updates };

        // Create deadline cache for performance
        const getDeadlines = makeDeadlineCache(user.timezone);

        const completionsToCreate = [];
        let currentDate = new Date(effectiveStartDate);

        while (currentDate <= endDate) {
          // Check if this product should generate a task on this date
          if (
            shouldGenerateForDate(
              {
                frequency: updatedProduct.frequency,
                days: updatedProduct.days ?? undefined,
              },
              currentDate,
            )
          ) {
            const timeOfDay = updatedProduct.timeOfDay;
            const deadlines = getDeadlines(currentDate, timeOfDay);

            completionsToCreate.push({
              routineProductId: validation.data,
              userProfileId: routine.userProfileId,
              scheduledDate: new Date(currentDate),
              scheduledTimeOfDay: timeOfDay,
              onTimeDeadline: deadlines.onTimeDeadline,
              gracePeriodEnd: deadlines.gracePeriodEnd,
              completedAt: null,
              status: "pending" as const,
            });
          }

          currentDate = addDays(currentDate, 1);
        }

        // Batch insert new tasks
        if (completionsToCreate.length > 0) {
          await tx.insert(routineStepCompletions).values(completionsToCreate);
        }
      });

      return { success: true, data: { ...product, ...updates } };
    } else {
      // No regeneration needed - just update product metadata
      await database
        .update(skincareRoutineProducts)
        .set({
          ...updates,
          updatedAt: now(),
        })
        .where(eq(skincareRoutineProducts.id, validation.data));

      return { success: true, data: { ...product, ...updates } };
    }
  } catch (error) {
    console.error("Error updating routine product:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to update routine product";
    return { success: false, error: errorMessage };
  }
}
