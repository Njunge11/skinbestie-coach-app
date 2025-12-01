"use server";

import { db } from "@/lib/db";
import {
  skincareRoutines,
  routineStepCompletions,
  skincareRoutineProducts,
  userProfiles,
} from "@/lib/db/schema";
import { makeRoutineRepo, type Routine } from "./routine.repo";
import {
  makeDeadlineCache,
  shouldGenerateForDate,
} from "@/lib/compliance-utils";
import { addDays } from "date-fns";
import { eq, and, lt, gt, desc, inArray } from "drizzle-orm";
import type { Result } from "@/lib/result";
import { type UpdateRoutineInput, updateRoutineSchema } from "./validation";
import { toMidnightUTC } from "./utils";

// Default dependencies (production)
const defaultRoutineDeps = {
  repo: makeRoutineRepo(),
  db: db,
  now: () => new Date(),
};

// Dependency injection types (inferred from defaults)
export type RoutineDeps = typeof defaultRoutineDeps;

/**
 * Update an existing routine with automatic task regeneration
 *
 * Handles:
 * - Start date FORWARD: Delete uncompleted tasks before new start
 * - Start date BACKWARD (future → today): Generate tasks for gap
 * - Start date BACKWARD (to past): Do nothing (no backfilling)
 * - End date EARLIER: Delete uncompleted tasks beyond new end
 * - End date LATER: Generate tasks for gap (respecting 60-day cap)
 * - End date → null: Extend to 60-day cap
 */
export async function updateRoutine(
  routineId: string,
  updates: UpdateRoutineInput,
  deps: RoutineDeps = defaultRoutineDeps,
): Promise<Result<Routine>> {
  const { repo, db, now } = deps;

  // Validate input with Zod
  const validation = updateRoutineSchema.safeParse({
    routineId,
    ...updates,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    // Fetch OLD routine data BEFORE updating (needed for comparison)
    const oldRoutine = await repo.findById(validation.data.routineId);

    if (!oldRoutine) {
      return { success: false, error: "Routine not found" };
    }

    // Build update data with validated fields (already trimmed by Zod)
    const updateData: Partial<Routine> = {
      updatedAt: now(),
    };

    if (validation.data.name !== undefined) {
      updateData.name = validation.data.name;
    }

    if (validation.data.startDate !== undefined) {
      updateData.startDate = validation.data.startDate;
    }

    if (validation.data.endDate !== undefined) {
      updateData.endDate = validation.data.endDate;
    }

    // TRANSACTION: Update routine + regenerate tasks
    const updatedRoutine = await db.transaction(async (tx) => {
      // 1. Update routine metadata
      const [updated] = await tx
        .update(skincareRoutines)
        .set(updateData)
        .where(eq(skincareRoutines.id, validation.data.routineId))
        .returning();

      if (!updated) {
        throw new Error("Routine not found");
      }

      // 2. If start date was updated, mark routineStartDateSet as true on user profile
      if (validation.data.startDate !== undefined) {
        await tx
          .update(userProfiles)
          .set({ routineStartDateSet: true })
          .where(eq(userProfiles.id, updated.userProfileId));
      }

      // Only regenerate if routine is published
      if (updated.status === "published") {
        const today = toMidnightUTC(now());
        const newStartDate = updated.startDate;
        const oldStartDate = oldRoutine.startDate;
        const newEndDate = updated.endDate;
        const oldEndDate = oldRoutine.endDate;

        // HANDLE START DATE CHANGES
        if (validation.data.startDate !== undefined) {
          const newStart = toMidnightUTC(newStartDate);
          const oldStart = toMidnightUTC(oldStartDate);
          console.log(
            `🔍 [UPDATE-ROUTINE] Start date change detected: ${oldStart.toISOString()} → ${newStart.toISOString()}`,
          );

          // Start date moved FORWARD: Delete uncompleted tasks before new start
          if (newStart > oldStart) {
            console.log(
              `⏩ [UPDATE-ROUTINE] Start moved FORWARD. Deleting tasks before ${newStart.toISOString()}`,
            );
            // Get product IDs for this routine
            const products = await tx
              .select({ id: skincareRoutineProducts.id })
              .from(skincareRoutineProducts)
              .where(
                eq(
                  skincareRoutineProducts.routineId,
                  validation.data.routineId,
                ),
              );

            const productIds = products.map((p) => p.id);
            console.log(
              `🔍 [UPDATE-ROUTINE] Found ${productIds.length} products for routine`,
            );

            if (productIds.length > 0) {
              // Delete only pending tasks BEFORE new start date
              // Keeps:
              // - All completed tasks (user's history is preserved)
              // - Pending tasks from new start onward (valid future tasks)
              const deleteResult = await tx
                .delete(routineStepCompletions)
                .where(
                  and(
                    inArray(
                      routineStepCompletions.routineProductId,
                      productIds,
                    ),
                    lt(routineStepCompletions.scheduledDate, newStart),
                    eq(routineStepCompletions.status, "pending"),
                  ),
                )
                .returning();

              console.log(
                `✅ [UPDATE-ROUTINE] Deleted ${deleteResult.length} tasks before new start date`,
              );
            } else {
              console.log(
                `⚠️ [UPDATE-ROUTINE] No products found, skipping task deletion`,
              );
            }
          }

          // Start date moved BACKWARD: Check if we need to fill gap
          // (e.g., future date → today's date)
          else if (newStart < oldStart) {
            console.log(
              `⏪ [UPDATE-ROUTINE] Start moved BACKWARD. Today: ${today.toISOString()}`,
            );
            // Calculate effective start dates (never before today)
            const oldEffectiveStart = new Date(
              Math.max(oldStart.getTime(), today.getTime()),
            );
            const newEffectiveStart = new Date(
              Math.max(newStart.getTime(), today.getTime()),
            );
            console.log(
              `🔍 [UPDATE-ROUTINE] Effective: ${newEffectiveStart.toISOString()} → ${oldEffectiveStart.toISOString()}`,
            );
            console.log(
              `🔍 [UPDATE-ROUTINE] Gap check: ${newEffectiveStart < oldEffectiveStart} && ${newStart >= today}`,
            );

            // Only fill gap if:
            // 1. New effective start is earlier than old (gap exists)
            // 2. New start date is not before today (no backfilling to past)
            if (newEffectiveStart < oldEffectiveStart && newStart >= today) {
              console.log(`✅ [UPDATE-ROUTINE] Gap fill conditions MET`);
              // Get product IDs for this routine
              const products = await tx
                .select({ id: skincareRoutineProducts.id })
                .from(skincareRoutineProducts)
                .where(
                  eq(
                    skincareRoutineProducts.routineId,
                    validation.data.routineId,
                  ),
                );

              const productIds = products.map((p) => p.id);
              console.log(
                `🔍 [UPDATE-ROUTINE] Found ${productIds.length} products for gap fill`,
              );

              if (productIds.length > 0) {
                // Calculate new 60-day window
                const defaultWindowEnd = addDays(newEffectiveStart, 59);
                const windowEnd = newEndDate
                  ? new Date(
                      Math.min(
                        defaultWindowEnd.getTime(),
                        toMidnightUTC(newEndDate).getTime(),
                      ),
                    )
                  : defaultWindowEnd;

                // Delete tasks beyond the new 60-day window
                await tx
                  .delete(routineStepCompletions)
                  .where(
                    and(
                      inArray(
                        routineStepCompletions.routineProductId,
                        productIds,
                      ),
                      gt(routineStepCompletions.scheduledDate, windowEnd),
                      eq(routineStepCompletions.status, "pending"),
                    ),
                  );

                // Find the earliest existing task date
                const earliestTasks = await tx
                  .select({
                    scheduledDate: routineStepCompletions.scheduledDate,
                  })
                  .from(routineStepCompletions)
                  .where(
                    inArray(
                      routineStepCompletions.routineProductId,
                      productIds,
                    ),
                  )
                  .orderBy(routineStepCompletions.scheduledDate)
                  .limit(1);

                if (earliestTasks.length > 0) {
                  const minExistingDate = toMidnightUTC(
                    earliestTasks[0].scheduledDate,
                  );

                  // Gap exists if new effective start is before earliest existing task
                  if (newEffectiveStart < minExistingDate) {
                    const gapStart = newEffectiveStart;
                    const gapEnd = addDays(minExistingDate, -1);

                    // Only fill gap up to the earliest existing task (don't duplicate)
                    // windowEnd already calculated above
                    const fillEnd = new Date(
                      Math.min(gapEnd.getTime(), windowEnd.getTime()),
                    );

                    // Only generate if gap exists within window
                    if (gapStart <= fillEnd) {
                      // Fetch products with full details for generation
                      const productsWithDetails = await tx
                        .select({
                          id: skincareRoutineProducts.id,
                          frequency: skincareRoutineProducts.frequency,
                          days: skincareRoutineProducts.days,
                          timeOfDay: skincareRoutineProducts.timeOfDay,
                        })
                        .from(skincareRoutineProducts)
                        .where(
                          eq(
                            skincareRoutineProducts.routineId,
                            validation.data.routineId,
                          ),
                        );

                      const [user] = await tx
                        .select({ timezone: userProfiles.timezone })
                        .from(userProfiles)
                        .where(eq(userProfiles.id, updated.userProfileId))
                        .limit(1);

                      if (productsWithDetails.length > 0 && user) {
                        // PERFORMANCE: Cache deadlines to avoid redundant timezone math
                        const getDeadlines = makeDeadlineCache(user.timezone);

                        // PERFORMANCE: Group products by timeOfDay for cache locality
                        const productsByTime: Record<
                          "morning" | "evening",
                          typeof productsWithDetails
                        > = {
                          morning: [],
                          evening: [],
                        };
                        for (const product of productsWithDetails) {
                          productsByTime[product.timeOfDay].push(product);
                        }

                        // Generate completions for gap
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
                        let currentDate = new Date(gapStart);

                        while (currentDate <= fillEnd) {
                          // Process morning products together (cache hit after first)
                          const morningDeadlines = getDeadlines(
                            currentDate,
                            "morning",
                          );
                          for (const product of productsByTime.morning) {
                            if (
                              shouldGenerateForDate(
                                {
                                  frequency: product.frequency,
                                  days: product.days ?? undefined,
                                },
                                currentDate,
                              )
                            ) {
                              completionsToCreate.push({
                                routineProductId: product.id,
                                userProfileId: updated.userProfileId,
                                scheduledDate: new Date(currentDate),
                                scheduledTimeOfDay: "morning",
                                onTimeDeadline: morningDeadlines.onTimeDeadline,
                                gracePeriodEnd: morningDeadlines.gracePeriodEnd,
                                completedAt: null,
                                status: "pending" as const,
                              });
                            }
                          }

                          // Process evening products together (cache hit after first)
                          const eveningDeadlines = getDeadlines(
                            currentDate,
                            "evening",
                          );
                          for (const product of productsByTime.evening) {
                            if (
                              shouldGenerateForDate(
                                {
                                  frequency: product.frequency,
                                  days: product.days ?? undefined,
                                },
                                currentDate,
                              )
                            ) {
                              completionsToCreate.push({
                                routineProductId: product.id,
                                userProfileId: updated.userProfileId,
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

                        console.log(
                          `✅ [UPDATE-ROUTINE] Generated ${completionsToCreate.length} gap tasks`,
                        );
                        if (completionsToCreate.length > 0) {
                          await tx
                            .insert(routineStepCompletions)
                            .values(completionsToCreate);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }

        // HANDLE END DATE CHANGES
        if (validation.data.endDate !== undefined) {
          // Get product IDs for this routine (needed for all end date operations)
          const products = await tx
            .select({ id: skincareRoutineProducts.id })
            .from(skincareRoutineProducts)
            .where(
              eq(skincareRoutineProducts.routineId, validation.data.routineId),
            );

          const productIds = products.map((p) => p.id);

          // End date set to a date (delete tasks beyond new end)
          // Handles: date → earlier date, date → later date (trim excess), null → date
          if (newEndDate && productIds.length > 0) {
            await tx
              .delete(routineStepCompletions)
              .where(
                and(
                  inArray(routineStepCompletions.routineProductId, productIds),
                  gt(
                    routineStepCompletions.scheduledDate,
                    toMidnightUTC(newEndDate),
                  ),
                  eq(routineStepCompletions.status, "pending"),
                ),
              );
          }

          // End date moved LATER: generate gap
          if (
            newEndDate &&
            oldEndDate &&
            toMidnightUTC(newEndDate) > toMidnightUTC(oldEndDate) &&
            productIds.length > 0
          ) {
            // Find the latest existing task date
            const latestTasks = await tx
              .select({ scheduledDate: routineStepCompletions.scheduledDate })
              .from(routineStepCompletions)
              .where(
                inArray(routineStepCompletions.routineProductId, productIds),
              )
              .orderBy(desc(routineStepCompletions.scheduledDate))
              .limit(1);

            if (latestTasks.length > 0) {
              const maxExistingDate = toMidnightUTC(
                latestTasks[0].scheduledDate,
              );
              const gapStart = addDays(maxExistingDate, 1);

              // Calculate window end: min(today + 60 days, new end date)
              const effectiveStartDate = new Date(
                Math.max(
                  toMidnightUTC(newStartDate).getTime(),
                  today.getTime(),
                ),
              );
              const defaultWindowEnd = addDays(effectiveStartDate, 59);
              const windowEnd = newEndDate
                ? new Date(
                    Math.min(
                      defaultWindowEnd.getTime(),
                      toMidnightUTC(newEndDate).getTime(),
                    ),
                  )
                : defaultWindowEnd;

              // Only generate if gap exists
              if (gapStart <= windowEnd) {
                // Fetch products and user for generation
                const products = await tx
                  .select({
                    id: skincareRoutineProducts.id,
                    frequency: skincareRoutineProducts.frequency,
                    days: skincareRoutineProducts.days,
                    timeOfDay: skincareRoutineProducts.timeOfDay,
                  })
                  .from(skincareRoutineProducts)
                  .where(
                    eq(
                      skincareRoutineProducts.routineId,
                      validation.data.routineId,
                    ),
                  );

                const [user] = await tx
                  .select({ timezone: userProfiles.timezone })
                  .from(userProfiles)
                  .where(eq(userProfiles.id, updated.userProfileId))
                  .limit(1);

                if (products.length > 0 && user) {
                  // PERFORMANCE: Cache deadlines to avoid redundant timezone math
                  const getDeadlines = makeDeadlineCache(user.timezone);

                  // PERFORMANCE: Group products by timeOfDay for cache locality
                  const productsByTime: Record<
                    "morning" | "evening",
                    typeof products
                  > = {
                    morning: [],
                    evening: [],
                  };
                  for (const product of products) {
                    productsByTime[product.timeOfDay].push(product);
                  }

                  // Generate completions for gap
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
                  let currentDate = new Date(gapStart);

                  while (currentDate <= windowEnd) {
                    // Process morning products together (cache hit after first)
                    const morningDeadlines = getDeadlines(
                      currentDate,
                      "morning",
                    );
                    for (const product of productsByTime.morning) {
                      if (
                        shouldGenerateForDate(
                          {
                            frequency: product.frequency,
                            days: product.days ?? undefined,
                          },
                          currentDate,
                        )
                      ) {
                        completionsToCreate.push({
                          routineProductId: product.id,
                          userProfileId: updated.userProfileId,
                          scheduledDate: new Date(currentDate),
                          scheduledTimeOfDay: "morning",
                          onTimeDeadline: morningDeadlines.onTimeDeadline,
                          gracePeriodEnd: morningDeadlines.gracePeriodEnd,
                          completedAt: null,
                          status: "pending" as const,
                        });
                      }
                    }

                    // Process evening products together (cache hit after first)
                    const eveningDeadlines = getDeadlines(
                      currentDate,
                      "evening",
                    );
                    for (const product of productsByTime.evening) {
                      if (
                        shouldGenerateForDate(
                          {
                            frequency: product.frequency,
                            days: product.days ?? undefined,
                          },
                          currentDate,
                        )
                      ) {
                        completionsToCreate.push({
                          routineProductId: product.id,
                          userProfileId: updated.userProfileId,
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

                  if (completionsToCreate.length > 0) {
                    await tx
                      .insert(routineStepCompletions)
                      .values(completionsToCreate);
                  }
                }
              }
            }
          }

          // End date set to null (indefinite): Extend to 60-day cap
          else if (!newEndDate && oldEndDate && productIds.length > 0) {
            // Similar to "later" case but with no end date limit
            const latestTasks = await tx
              .select({ scheduledDate: routineStepCompletions.scheduledDate })
              .from(routineStepCompletions)
              .where(
                inArray(routineStepCompletions.routineProductId, productIds),
              )
              .orderBy(desc(routineStepCompletions.scheduledDate))
              .limit(1);

            if (latestTasks.length > 0) {
              const maxExistingDate = toMidnightUTC(
                latestTasks[0].scheduledDate,
              );
              const gapStart = addDays(maxExistingDate, 1);

              const effectiveStartDate = new Date(
                Math.max(
                  toMidnightUTC(newStartDate).getTime(),
                  today.getTime(),
                ),
              );
              const windowEnd = addDays(effectiveStartDate, 59);

              if (gapStart <= windowEnd) {
                const products = await tx
                  .select({
                    id: skincareRoutineProducts.id,
                    frequency: skincareRoutineProducts.frequency,
                    days: skincareRoutineProducts.days,
                    timeOfDay: skincareRoutineProducts.timeOfDay,
                  })
                  .from(skincareRoutineProducts)
                  .where(
                    eq(
                      skincareRoutineProducts.routineId,
                      validation.data.routineId,
                    ),
                  );

                const [user] = await tx
                  .select({ timezone: userProfiles.timezone })
                  .from(userProfiles)
                  .where(eq(userProfiles.id, updated.userProfileId))
                  .limit(1);

                if (products.length > 0 && user) {
                  // PERFORMANCE: Cache deadlines to avoid redundant timezone math
                  const getDeadlines = makeDeadlineCache(user.timezone);

                  // PERFORMANCE: Group products by timeOfDay for cache locality
                  const productsByTime: Record<
                    "morning" | "evening",
                    typeof products
                  > = {
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
                  let currentDate = new Date(gapStart);

                  while (currentDate <= windowEnd) {
                    // Process morning products together (cache hit after first)
                    const morningDeadlines = getDeadlines(
                      currentDate,
                      "morning",
                    );
                    for (const product of productsByTime.morning) {
                      if (
                        shouldGenerateForDate(
                          {
                            frequency: product.frequency,
                            days: product.days ?? undefined,
                          },
                          currentDate,
                        )
                      ) {
                        completionsToCreate.push({
                          routineProductId: product.id,
                          userProfileId: updated.userProfileId,
                          scheduledDate: new Date(currentDate),
                          scheduledTimeOfDay: "morning",
                          onTimeDeadline: morningDeadlines.onTimeDeadline,
                          gracePeriodEnd: morningDeadlines.gracePeriodEnd,
                          completedAt: null,
                          status: "pending" as const,
                        });
                      }
                    }

                    // Process evening products together (cache hit after first)
                    const eveningDeadlines = getDeadlines(
                      currentDate,
                      "evening",
                    );
                    for (const product of productsByTime.evening) {
                      if (
                        shouldGenerateForDate(
                          {
                            frequency: product.frequency,
                            days: product.days ?? undefined,
                          },
                          currentDate,
                        )
                      ) {
                        completionsToCreate.push({
                          routineProductId: product.id,
                          userProfileId: updated.userProfileId,
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

                  if (completionsToCreate.length > 0) {
                    await tx
                      .insert(routineStepCompletions)
                      .values(completionsToCreate);
                  }
                }
              }
            }
          }
        }
      }

      return updated as Routine;
    });

    return { success: true, data: updatedRoutine };
  } catch (error) {
    console.error("Error updating routine:", error);
    return {
      success: false,
      error: `Failed to update routine: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
