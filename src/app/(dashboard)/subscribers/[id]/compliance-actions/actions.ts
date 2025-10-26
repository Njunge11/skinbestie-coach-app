"use server";

import { z } from "zod";
import { makeRoutineStepCompletionsRepo } from "./routine-step-completions.repo";
import { makeRoutineRepo } from "./routine.repo";
import { makeRoutineProductsRepo } from "./routine-products.repo";
import { makeUserProfileRepo } from "./user-profile.repo";
import { calculateDeadlines, shouldGenerateForDate, determineStatus } from "@/lib/compliance-utils";
import { addMonths, addDays, format } from "date-fns";
import { makeRoutineProductsRepo as makeRoutineProductsRepoForStats } from "../routine-actions/routine.repo";

// Result types following TESTING.md pattern
type SuccessResult<T> = { success: true; data: T };
type ErrorResult = { success: false; error: string };
type Result<T> = SuccessResult<T> | ErrorResult;

// Dependency injection type
export type ComplianceDeps = {
  repo: ReturnType<typeof makeRoutineStepCompletionsRepo>;
};

// Default dependencies (uses REAL repo for production)
const defaultDeps: ComplianceDeps = {
  repo: makeRoutineStepCompletionsRepo(),
};

/**
 * Mark overdue pending steps as missed
 *
 * This is called lazily before any read operation to ensure
 * that steps past their grace period are marked as missed.
 *
 * @param userId - The user's ID
 * @param now - Current timestamp (defaults to new Date(), injected for tests)
 * @param deps - Dependencies (repo), injected for tests
 * @returns Result with count of steps marked as missed
 */
export async function markOverdueAsMissed(
  userId: string,
  now: Date = new Date(),
  deps: ComplianceDeps = defaultDeps
): Promise<Result<{ count: number }>> {
  const { repo } = deps;

  try {
    // Mark all pending steps past their grace period as 'missed'
    const count = await repo.markOverdue(userId, now);

    return {
      success: true,
      data: { count },
    };
  } catch (error) {
    console.error("Error marking overdue steps:", error);
    return {
      success: false,
      error: "Failed to mark overdue steps",
    };
  }
}

/**
 * Mark a step as complete
 *
 * Users can only complete their own steps, and only if the grace period
 * has not expired. The status (on-time, late, or missed) is calculated
 * based on when the step was completed relative to the deadlines.
 *
 * @param stepCompletionId - The ID of the step completion to mark
 * @param userId - The user's ID (for security check)
 * @param now - Current timestamp (defaults to new Date(), injected for tests)
 * @param deps - Dependencies (repo), injected for tests
 * @returns Result with the updated step data
 */
export async function markStepComplete(
  stepCompletionId: string,
  userId: string,
  now: Date = new Date(),
  deps: ComplianceDeps = defaultDeps
): Promise<
  Result<{ status: "on-time" | "late" | "missed"; completedAt: Date }>
> {
  const { repo } = deps;

  try {
    // Find the step
    const step = await repo.findById(stepCompletionId);

    // Check if step exists and belongs to this user
    if (!step || step.userProfileId !== userId) {
      return {
        success: false,
        error: "Step not found",
      };
    }

    // Check if already completed
    if (step.completedAt !== null) {
      return {
        success: false,
        error: "Step already completed",
      };
    }

    // Check if grace period has expired
    if (now > step.gracePeriodEnd) {
      return {
        success: false,
        error: "This step can no longer be completed (grace period expired)",
      };
    }

    // Calculate status based on completion time
    const status = determineStatus(now, step.onTimeDeadline, step.gracePeriodEnd);

    // Update the step
    const updated = await repo.update(stepCompletionId, {
      completedAt: now,
      status,
      updatedAt: now,
    });

    if (!updated) {
      return {
        success: false,
        error: "Failed to update step",
      };
    }

    return {
      success: true,
      data: {
        status,
        completedAt: now,
      },
    };
  } catch (error) {
    console.error("Error completing step:", error);
    return {
      success: false,
      error: "Failed to complete step",
    };
  }
}

// Dependency injection type for generateScheduledSteps
export type GenerateStepsDeps = {
  routineRepo: {
    findById: (id: string) => Promise<{
      id: string;
      userProfileId: string;
      name: string;
      startDate: Date;
      endDate: Date | null;
    } | null>;
  };
  productRepo: {
    findByRoutineId: (routineId: string) => Promise<
      {
        id: string;
        routineId: string;
        userProfileId: string;
        routineStep: string;
        productName: string;
        instructions: string;
        frequency: string;
        days?: string[];
        timeOfDay: "morning" | "evening";
      }[]
    >;
  };
  userRepo: {
    findById: (id: string) => Promise<{
      id: string;
      timezone: string;
    } | null>;
  };
  completionsRepo: ReturnType<typeof makeRoutineStepCompletionsRepo>;
};

// Default dependencies for generateScheduledSteps (uses REAL repos for production)
const defaultGenerateStepsDeps: GenerateStepsDeps = {
  routineRepo: makeRoutineRepo(),
  productRepo: makeRoutineProductsRepo(),
  userRepo: makeUserProfileRepo(),
  completionsRepo: makeRoutineStepCompletionsRepo(),
};

/**
 * Delete scheduled steps for a single product from today onwards (pending and missed only)
 *
 * Used when updating or deleting a product in a published routine.
 *
 * @param productId - The ID of the routine product
 * @param routineId - The ID of the routine (unused but kept for consistency)
 * @param userId - The user's ID (unused but kept for consistency)
 * @param deps - Dependencies (repos), injected for tests
 * @returns Result with count of steps deleted
 */
export async function deleteScheduledStepsForProduct(
  productId: string,
  routineId: string,
  userId: string,
  deps: GenerateStepsDeps = defaultGenerateStepsDeps
): Promise<Result<{ count: number }>> {
  const { completionsRepo } = deps;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Delete pending and missed steps from today onwards
    const count = await completionsRepo.deleteByRoutineProductId(
      productId,
      today,
      ["pending", "missed"]
    );

    return {
      success: true,
      data: { count },
    };
  } catch (error) {
    console.error("Error deleting scheduled steps for product:", error);
    return {
      success: false,
      error: "Failed to delete scheduled steps",
    };
  }
}

/**
 * Generate scheduled steps for a single product (used when adding product to published routine)
 *
 * Creates completion records for one product from today onwards.
 *
 * @param productId - The ID of the routine product
 * @param routineId - The ID of the routine
 * @param userId - The user's ID
 * @param deps - Dependencies (repos), injected for tests
 * @returns Result with count of steps created
 */
export async function generateScheduledStepsForProduct(
  productId: string,
  routineId: string,
  userId: string,
  deps: GenerateStepsDeps = defaultGenerateStepsDeps
): Promise<Result<{ count: number }>> {
  const { routineRepo, productRepo, userRepo, completionsRepo } = deps;

  try {
    // Fetch the routine
    const routine = await routineRepo.findById(routineId);
    if (!routine) {
      return {
        success: false,
        error: "Routine not found",
      };
    }

    // Fetch the user (for timezone)
    const user = await userRepo.findById(routine.userProfileId);
    if (!user) {
      return {
        success: false,
        error: "User profile not found",
      };
    }

    // Fetch the specific product
    const products = await productRepo.findByRoutineId(routineId);
    const product = products.find((p) => p.id === productId);

    if (!product) {
      return {
        success: false,
        error: "Product not found",
      };
    }

    // Determine end date (use routine end date or 6 months from now)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const endDate = routine.endDate ?? addMonths(today, 6);

    // Generate completion records from today onwards
    const completionsToCreate = [];
    let currentDate = new Date(today);

    // Loop through each day from today to end
    while (currentDate <= endDate) {
      // Check if product should be scheduled on this day
      if (shouldGenerateForDate(product, currentDate)) {
        // Calculate deadlines for this step
        const { onTimeDeadline, gracePeriodEnd } = calculateDeadlines(
          currentDate,
          product.timeOfDay,
          user.timezone
        );

        // Create completion record
        completionsToCreate.push({
          routineProductId: product.id,
          userProfileId: routine.userProfileId,
          scheduledDate: new Date(currentDate),
          scheduledTimeOfDay: product.timeOfDay,
          onTimeDeadline,
          gracePeriodEnd,
          completedAt: null,
          status: "pending" as const,
        });
      }

      // Move to next day
      currentDate = addDays(currentDate, 1);
    }

    // Batch insert all completions
    await completionsRepo.createMany(completionsToCreate);

    return {
      success: true,
      data: { count: completionsToCreate.length },
    };
  } catch (error) {
    console.error("Error generating scheduled steps for product:", error);
    return {
      success: false,
      error: "Failed to generate scheduled steps",
    };
  }
}

/**
 * Generate scheduled step completions for a routine
 *
 * Creates completion records for each day/product based on the routine's
 * start/end dates, product frequencies, and user timezone.
 *
 * For ongoing routines (no endDate), generates 6 months ahead.
 *
 * @param routineId - The ID of the routine
 * @param deps - Dependencies (repos), injected for tests
 * @returns Result with count of steps created
 */
export async function generateScheduledSteps(
  routineId: string,
  deps: GenerateStepsDeps = defaultGenerateStepsDeps
): Promise<Result<{ count: number }>> {
  const { routineRepo, productRepo, userRepo, completionsRepo } = deps;

  try {
    // Fetch the routine
    const routine = await routineRepo.findById(routineId);
    if (!routine) {
      return {
        success: false,
        error: "Routine not found",
      };
    }

    // Fetch the user (for timezone)
    const user = await userRepo.findById(routine.userProfileId);
    if (!user) {
      return {
        success: false,
        error: "User profile not found",
      };
    }

    // Fetch all products for this routine
    const products = await productRepo.findByRoutineId(routineId);

    // If no products, return success with zero count
    if (products.length === 0) {
      return {
        success: true,
        data: { count: 0 },
      };
    }

    // Determine end date (use routine end date or 6 months from start)
    const endDate = routine.endDate ?? addMonths(routine.startDate, 6);

    // Generate completion records
    const completionsToCreate = [];
    let currentDate = new Date(routine.startDate);

    // Loop through each day from start to end
    while (currentDate <= endDate) {
      // For each product, check if it should be scheduled on this day
      for (const product of products) {
        if (shouldGenerateForDate(product, currentDate)) {
          // Calculate deadlines for this step
          const { onTimeDeadline, gracePeriodEnd } = calculateDeadlines(
            currentDate,
            product.timeOfDay,
            user.timezone
          );

          // Create completion record
          completionsToCreate.push({
            routineProductId: product.id,
            userProfileId: routine.userProfileId,
            scheduledDate: new Date(currentDate),
            scheduledTimeOfDay: product.timeOfDay,
            onTimeDeadline,
            gracePeriodEnd,
            completedAt: null,
            status: "pending" as const,
          });
        }
      }

      // Move to next day
      currentDate = addDays(currentDate, 1);
    }

    // Batch insert all completions
    await completionsRepo.createMany(completionsToCreate);

    return {
      success: true,
      data: { count: completionsToCreate.length },
    };
  } catch (error) {
    console.error("Error generating scheduled steps:", error);
    return {
      success: false,
      error: "Failed to generate scheduled steps",
    };
  }
}

// Dependency injection type for getComplianceStats
export type ComplianceStatsDeps = {
  completionsRepo: ReturnType<typeof makeRoutineStepCompletionsRepo>;
  productsRepo: ReturnType<typeof makeRoutineProductsRepoForStats>;
};

// Default dependencies for getComplianceStats
const defaultComplianceStatsDeps: ComplianceStatsDeps = {
  completionsRepo: makeRoutineStepCompletionsRepo(),
  productsRepo: makeRoutineProductsRepoForStats(),
};

// Return types for compliance stats
export type ComplianceStats = {
  overall: {
    prescribed: number;
    onTime: number;
    late: number;
    missed: number;
  };
  am: {
    prescribed: number;
    completed: number;
    onTime: number;
    late: number;
    missed: number;
  };
  pm: {
    prescribed: number;
    completed: number;
    onTime: number;
    late: number;
    missed: number;
  };
  steps: Array<{
    routineProductId: string;
    routineStep: string;
    productName: string;
    timeOfDay: "morning" | "evening";
    frequency: string;
    prescribed: number;
    completed: number;
    onTime: number;
    late: number;
    missed: number;
    missedDates: string[];
  }>;
};

/**
 * Get compliance statistics for a user within a date range
 *
 * Aggregates scheduled step completions to provide:
 * - Overall adherence stats (prescribed, on-time, late, missed)
 * - AM/PM split stats
 * - Per-product breakdown with missed dates
 *
 * Note: Pending steps are excluded from stats (only count completed/missed)
 *
 * @param userId - The user's ID
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @param deps - Dependencies (repos), injected for tests
 * @returns Result with compliance statistics
 */
export async function getComplianceStats(
  userId: string,
  startDate: Date,
  endDate: Date,
  deps: ComplianceStatsDeps = defaultComplianceStatsDeps
): Promise<Result<ComplianceStats>> {
  const { completionsRepo, productsRepo } = deps;

  // Validate userId
  const validation = z.string().uuid().safeParse(userId);
  if (!validation.success) {
    return { success: false, error: "Invalid user ID" };
  }

  try {
    // Fetch completions in date range
    const completions = await completionsRepo.findByUserAndDateRange(
      validation.data,
      startDate,
      endDate
    );

    // Filter out pending steps - only count completed or missed
    const countableCompletions = completions.filter((c) => c.status !== "pending");

    // Fetch product details for all completions in a single batch query
    const productIds = [...new Set(countableCompletions.map((c) => c.routineProductId))];
    const products = await productsRepo.findByIds(productIds);
    const productsMap = new Map(products.map((p) => [p.id, p]));

    // Calculate overall stats
    const overall = {
      prescribed: countableCompletions.length,
      onTime: countableCompletions.filter((c) => c.status === "on-time").length,
      late: countableCompletions.filter((c) => c.status === "late").length,
      missed: countableCompletions.filter((c) => c.status === "missed").length,
    };

    // Calculate AM stats
    const amCompletions = countableCompletions.filter((c) => c.scheduledTimeOfDay === "morning");
    const am = {
      prescribed: amCompletions.length,
      completed: amCompletions.filter((c) => c.status === "on-time" || c.status === "late").length,
      onTime: amCompletions.filter((c) => c.status === "on-time").length,
      late: amCompletions.filter((c) => c.status === "late").length,
      missed: amCompletions.filter((c) => c.status === "missed").length,
    };

    // Calculate PM stats
    const pmCompletions = countableCompletions.filter((c) => c.scheduledTimeOfDay === "evening");
    const pm = {
      prescribed: pmCompletions.length,
      completed: pmCompletions.filter((c) => c.status === "on-time" || c.status === "late").length,
      onTime: pmCompletions.filter((c) => c.status === "on-time").length,
      late: pmCompletions.filter((c) => c.status === "late").length,
      missed: pmCompletions.filter((c) => c.status === "missed").length,
    };

    // Calculate per-product stats
    const productStats = new Map<string, {
      routineProductId: string;
      routineStep: string;
      productName: string;
      timeOfDay: "morning" | "evening";
      frequency: string;
      completions: typeof countableCompletions;
    }>();

    for (const completion of countableCompletions) {
      const product = productsMap.get(completion.routineProductId);
      if (!product) continue;

      if (!productStats.has(completion.routineProductId)) {
        productStats.set(completion.routineProductId, {
          routineProductId: completion.routineProductId,
          routineStep: product.routineStep,
          productName: product.productName,
          timeOfDay: product.timeOfDay,
          frequency: product.frequency,
          completions: [],
        });
      }

      productStats.get(completion.routineProductId)!.completions.push(completion);
    }

    // Build steps array
    const steps = Array.from(productStats.values()).map((productStat) => {
      const completions = productStat.completions;
      const missedCompletions = completions.filter((c) => c.status === "missed");

      return {
        routineProductId: productStat.routineProductId,
        routineStep: productStat.routineStep,
        productName: productStat.productName,
        timeOfDay: productStat.timeOfDay,
        frequency: productStat.frequency,
        prescribed: completions.length,
        completed: completions.filter((c) => c.status === "on-time" || c.status === "late").length,
        onTime: completions.filter((c) => c.status === "on-time").length,
        late: completions.filter((c) => c.status === "late").length,
        missed: missedCompletions.length,
        missedDates: missedCompletions.map((c) =>
          format(c.scheduledDate, "EEEE, MMM d, yyyy")
        ),
      };
    });

    return {
      success: true,
      data: {
        overall,
        am,
        pm,
        steps,
      },
    };
  } catch (error) {
    console.error("Error fetching compliance stats:", error);
    return {
      success: false,
      error: "Failed to fetch compliance stats",
    };
  }
}
