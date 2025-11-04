"use server";

import { db } from "@/lib/db";
import { skincareRoutines, routineStepCompletions } from "@/lib/db/schema";
import { makeRoutineRepo, type Routine } from "./routine.repo";
import { makeRoutineProductsRepo } from "../compliance-actions/routine-products.repo";
import { makeUserProfileRepo } from "../compliance-actions/user-profile.repo";
import {
  makeDeadlineCache,
  shouldGenerateForDate,
} from "@/lib/compliance-utils";
import { addDays } from "date-fns";
import { eq } from "drizzle-orm";
import type { Result } from "@/lib/result";
import { uuidSchema } from "./validation";
import { toMidnightUTC } from "./utils";

// Default dependencies for publishRoutine (production)
const defaultPublishDeps = {
  routineRepo: makeRoutineRepo(),
  productRepo: makeRoutineProductsRepo(),
  userRepo: makeUserProfileRepo(),
  db: db,
  now: () => new Date(),
};

// Dependency injection for publishRoutine (inferred from defaults)
export type PublishRoutineDeps = typeof defaultPublishDeps;

/**
 * Publish a routine - updates status to published and generates scheduled steps
 *
 * TRANSACTION FIX: Previously this had two separate operations:
 * 1. generateScheduledSteps() - using repo (global db)
 * 2. routineRepo.update() - using repo (global db)
 *
 * This caused data integrity issues if step 2 failed - scheduled steps would exist
 * but routine would stay "draft".
 *
 * FIX: Inline step generation SQL into a single transaction with status update.
 */
export async function publishRoutine(
  routineId: string,
  deps: PublishRoutineDeps = defaultPublishDeps,
): Promise<Result<Routine>> {
  const { routineRepo, productRepo, userRepo, now } = deps;

  // Validate input with Zod
  const validation = uuidSchema.safeParse(routineId);

  if (!validation.success) {
    return { success: false, error: "Invalid routine ID" };
  }

  try {
    // Fetch all required data BEFORE transaction (read-only operations)
    const routine = await routineRepo.findById(validation.data);

    if (!routine) {
      return { success: false, error: "Routine not found" };
    }

    // Check if already published
    if (routine.status === "published") {
      return { success: false, error: "Routine is already published" };
    }

    // Check if routine has products
    const products = await productRepo.findByRoutineId(validation.data);
    if (products.length === 0) {
      return {
        success: false,
        error: "Cannot publish routine without products",
      };
    }

    // Fetch user for timezone
    const user = await userRepo.findById(routine.userProfileId);
    if (!user) {
      return { success: false, error: "User profile not found" };
    }

    // Calculate scheduled steps data BEFORE transaction
    // 60-day rolling window: effectiveStartDate = max(routine.startDate, today)
    // Normalize all dates to midnight UTC for consistent comparisons
    const today = toMidnightUTC(now());
    const routineStart = toMidnightUTC(routine.startDate);
    const effectiveStartDate = new Date(
      Math.max(routineStart.getTime(), today.getTime()),
    );

    // Calculate window end: today + 60 days (capped by end date if exists)
    // For 60-day window: day 0 to day 59 = 60 days, so add 59 for inclusive loop
    const defaultWindowEnd = addDays(effectiveStartDate, 59);
    const endDate = routine.endDate
      ? new Date(
          Math.min(
            defaultWindowEnd.getTime(),
            toMidnightUTC(routine.endDate).getTime(),
          ),
        )
      : defaultWindowEnd;

    // PERFORMANCE OPTIMIZATION: Create cached deadline calculator
    // Avoids redundant timezone calculations for products on same day/time
    // For 10 products × 60 days = 600 iterations:
    // - Without cache: 600 timezone conversions
    // - With cache: ~120 conversions (60 days × 2 timeOfDay values)
    const getDeadlines = makeDeadlineCache(user.timezone);

    // PERFORMANCE OPTIMIZATION: Group products by timeOfDay
    // Improves cache locality - all morning products processed together
    const productsByTime: Record<"morning" | "evening", typeof products> = {
      morning: [],
      evening: [],
    };

    for (const product of products) {
      productsByTime[product.timeOfDay].push(product);
    }

    const completionsToCreate: Array<{
      routineProductId: string;
      userProfileId: string;
      scheduledDate: Date;
      scheduledTimeOfDay: "morning" | "evening";
      onTimeDeadline: Date;
      gracePeriodEnd: Date;
      completedAt: null;
      status: "pending";
    }> = [];
    let currentDate = new Date(effectiveStartDate);

    while (currentDate <= endDate) {
      // Process morning products (cache hit for all after first)
      const morningDeadlines = getDeadlines(currentDate, "morning");
      for (const product of productsByTime.morning) {
        if (
          shouldGenerateForDate(
            { frequency: product.frequency, days: product.days ?? undefined },
            currentDate,
          )
        ) {
          completionsToCreate.push({
            routineProductId: product.id,
            userProfileId: routine.userProfileId,
            scheduledDate: new Date(currentDate),
            scheduledTimeOfDay: "morning",
            onTimeDeadline: morningDeadlines.onTimeDeadline,
            gracePeriodEnd: morningDeadlines.gracePeriodEnd,
            completedAt: null,
            status: "pending" as const,
          });
        }
      }

      // Process evening products (cache hit for all after first)
      const eveningDeadlines = getDeadlines(currentDate, "evening");
      for (const product of productsByTime.evening) {
        if (
          shouldGenerateForDate(
            { frequency: product.frequency, days: product.days ?? undefined },
            currentDate,
          )
        ) {
          completionsToCreate.push({
            routineProductId: product.id,
            userProfileId: routine.userProfileId,
            scheduledDate: new Date(currentDate),
            scheduledTimeOfDay: "evening",
            onTimeDeadline: eveningDeadlines.onTimeDeadline,
            gracePeriodEnd: eveningDeadlines.gracePeriodEnd,
            completedAt: null,
            status: "pending" as const,
          });
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    // CRITICAL: Both status update AND step creation in ONE transaction
    const updatedRoutine = await deps.db.transaction(async (tx) => {
      // Update routine status using tx
      const [updated] = await tx
        .update(skincareRoutines)
        .set({
          status: "published",
          updatedAt: now(),
        })
        .where(eq(skincareRoutines.id, validation.data))
        .returning();

      if (!updated) {
        throw new Error("Failed to update routine status");
      }

      // Insert all scheduled steps using tx
      if (completionsToCreate.length > 0) {
        await tx.insert(routineStepCompletions).values(completionsToCreate);
      }

      return updated as Routine;
    });

    return { success: true, data: updatedRoutine };
  } catch (error) {
    console.error("Error publishing routine:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to publish routine";
    return { success: false, error: errorMessage };
  }
}
