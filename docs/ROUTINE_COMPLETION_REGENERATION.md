# Routine Completion Regeneration

## Problem Statement

When a published routine's start or end dates are updated, the `routine_step_completions` table is not automatically updated. This creates gaps in the completion records.

### Example Scenario
1. Routine published with `startDate = 2025-11-03`, generates completions from Nov 3 onwards
2. Admin updates `startDate = 2025-10-30` via `updateRoutine()`
3. No completions exist for Oct 30 - Nov 2
4. `todayRoutine` API returns empty array for dates in the gap

### Current Behavior
- `publishRoutine()` generates all completion records for the routine date range
- `updateRoutine()` only updates routine metadata, does NOT regenerate completions
- Result: Date changes create gaps or orphaned completions

## Proposed Solution: Fill Missing Date Gaps

### Approach: "Only add missing dates (don't delete)"

**Philosophy:** Preserve user completion history while filling gaps.

**Logic:**
1. When updating a published routine's dates
2. Find existing completion date range (min/max)
3. Generate completions ONLY for missing date ranges:
   - **Gap before:** If new start date < existing min date → generate for [newStart, existingMin - 1]
   - **Gap after:** If new end date > existing max date → generate for [existingMax + 1, newEnd]
4. Never delete existing completions (preserves user progress)

### Benefits
- ✅ Preserves completion history
- ✅ Fills date gaps automatically
- ✅ No data loss

### Trade-offs
- ⚠️ May have "orphan" completions outside the current routine date range if dates move later
- ⚠️ Doesn't handle frequency/product changes (only date changes)

## Implementation Design

### High-Level Flow

```typescript
async function updateRoutine(routineId, updates) {
  return await db.transaction(async (tx) => {
    // 1. Update routine metadata
    const updatedRoutine = await repo.update(routineId, updates);

    // 2. If published AND dates changed, regenerate missing completions
    if (updatedRoutine.status === 'published' &&
        (updates.startDate || updates.endDate)) {
      await regenerateMissingCompletions(
        routineId,
        updatedRoutine.startDate,
        updatedRoutine.endDate,
        updatedRoutine.userProfileId
      );
    }

    return updatedRoutine;
  });
}
```

### Optimized Query Strategy

**Goal:** Avoid N+1 queries and use batch inserts.

#### Step 1: Single Query to Get All Data

```typescript
const result = await db
  .select({
    // Routine products
    productId: schema.skincareRoutineProducts.id,
    frequency: schema.skincareRoutineProducts.frequency,
    days: schema.skincareRoutineProducts.days,
    timeOfDay: schema.skincareRoutineProducts.timeOfDay,
    // Existing completion date range (aggregated via window functions)
    minExistingDate: sql<Date>`MIN(${schema.routineStepCompletions.scheduledDate}) OVER()`,
    maxExistingDate: sql<Date>`MAX(${schema.routineStepCompletions.scheduledDate}) OVER()`,
  })
  .from(schema.skincareRoutineProducts)
  .leftJoin(
    schema.routineStepCompletions,
    eq(
      schema.routineStepCompletions.routineProductId,
      schema.skincareRoutineProducts.id
    )
  )
  .where(eq(schema.skincareRoutineProducts.routineId, routineId))
  .groupBy(schema.skincareRoutineProducts.id);
```

**Why this works:**
- **Window functions (`OVER()`)** calculate MIN/MAX across ALL completions without collapsing rows
- **LEFT JOIN** includes products even if no completions exist yet
- **GROUP BY** deduplicates products (since JOIN creates multiple rows per product)
- **Result:** All products + date range in ONE query (no N+1)

#### Step 2: Calculate Missing Date Ranges

```typescript
const minExistingDate = result[0]?.minExistingDate;
const maxExistingDate = result[0]?.maxExistingDate;

const gapBefore = minExistingDate && newStartDate < minExistingDate
  ? { from: newStartDate, to: addDays(minExistingDate, -1) }
  : null;

const gapAfter = maxExistingDate && newEndDate > maxExistingDate
  ? { from: addDays(maxExistingDate, 1), to: newEndDate }
  : null;
```

#### Step 3: Build Completions Array in Memory

```typescript
const completionsToInsert: NewRoutineStepCompletion[] = [];

for (const product of products) {
  // For gap BEFORE
  if (gapBefore) {
    let currentDate = new Date(gapBefore.from);
    while (currentDate <= gapBefore.to) {
      if (shouldGenerateForDate(product, currentDate)) {
        const { onTimeDeadline, gracePeriodEnd } = calculateDeadlines(
          currentDate,
          product.timeOfDay,
          timezone
        );

        completionsToInsert.push({
          routineProductId: product.productId,
          userProfileId,
          scheduledDate: new Date(currentDate),
          scheduledTimeOfDay: product.timeOfDay,
          onTimeDeadline,
          gracePeriodEnd,
          status: 'pending',
          completedAt: null,
        });
      }
      currentDate = addDays(currentDate, 1);
    }
  }

  // For gap AFTER (same logic)
  if (gapAfter) {
    // ... similar loop for after gap
  }
}
```

**Key:** All calculations done in-memory, no database calls inside loops.

#### Step 4: Single Batch Insert

```typescript
if (completionsToInsert.length > 0) {
  // Drizzle generates: INSERT INTO ... VALUES (...), (...), (...)
  await db.insert(schema.routineStepCompletions).values(completionsToInsert);
}
```

**Performance:** One INSERT with multiple VALUES, not N individual INSERTs.

### Complete Function Signature

```typescript
async function regenerateMissingCompletions(
  routineId: string,
  newStartDate: Date,
  newEndDate: Date,
  userProfileId: string,
  timezone: string
): Promise<void>
```

## Performance Characteristics

### Query Count
- **Before optimization:** N+1 queries (1 for products, N for individual inserts)
- **After optimization:** 3 queries total regardless of date range:
  1. SELECT (products + date range)
  2. UPDATE (routine metadata)
  3. INSERT (batch all completions)

### Example: Fill 4-day gap with 7 products
- **Naive approach:** 1 + 28 queries = 29 queries
- **Optimized approach:** 3 queries (96% reduction)

## Edge Cases to Consider

### Case 1: No existing completions
- `minExistingDate` and `maxExistingDate` will be `null`
- Generate completions for entire new date range

### Case 2: Start date moves later, end date moves earlier
- Creates orphan completions outside new range
- **Decision:** Keep orphans (preserve history)
- Alternative: Add cleanup logic (loses data)

### Case 3: Products added/removed after publishing
- This implementation only handles date changes
- Product changes require separate logic

### Case 4: Frequency changes (daily → specific days)
- Not handled by this implementation
- Would require comparing existing vs new schedules

## Testing Considerations

### Unit Tests
- Mock `db` to verify query structure
- Test date range calculations:
  - Start moves earlier
  - End moves later
  - Both move
  - Dates unchanged
- Test edge cases (no existing completions, etc.)

### Integration Tests
- Publish routine → update dates → verify completions exist for all dates
- Update dates multiple times → verify no duplicates
- User completes steps → update dates → verify completion history preserved

## Future Enhancements

### 1. Handle Product Changes
When products are added/removed from published routines, regenerate completions accordingly.

### 2. Handle Frequency Changes
When a product's frequency changes, update existing completions to match new schedule.

### 3. Cleanup Orphaned Completions
Option to delete completions outside the current routine date range (with user confirmation).

### 4. Batch Processing for Large Date Ranges
For very large date ranges (e.g., extending by 2 years), split INSERT into chunks to avoid memory issues.

## Related Code

- **Publish routine:** `src/app/(dashboard)/subscribers/[id]/routine-info-actions/actions.ts` (line 256)
- **Update routine:** `src/app/(dashboard)/subscribers/[id]/routine-info-actions/actions.ts` (line 137)
- **Compliance utils:** `src/lib/compliance-utils.ts` (`shouldGenerateForDate`, `calculateDeadlines`)
- **Dashboard API:** `src/app/api/consumer-app/dashboard/dashboard.repo.ts` (`getTodayRoutineSteps`)

## Status

**NOT IMPLEMENTED** - Documented for future implementation.

Current workaround: Unpublish and republish routine to regenerate all completions (loses completion history).
