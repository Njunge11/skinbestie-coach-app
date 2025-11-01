# Routine Task Generation & Regeneration

## Purpose

Enable coaches to assign routines to users, and automatically generate daily tasks (e.g., use cleanser) based on each user's routine, so that users know what to do each day, and the system can track progress over time.

---

## Core Flow (Happy Path)

### 1. Coach publishes a routine

Coach sets:
- A **start date** (when the routine should begin)
- An optional **end date** (when the routine should stop)
- A list of **products** the user should use (e.g., cleanser, SPF)
- For each product:
  - **Frequency** (e.g., daily, Mon/Wed/Fri, 3x/week)
  - **Time of day** (morning or evening)

### 2. System generates routine tasks

When the coach publishes the routine:
- Tasks are created **only from the routine's start date or today**, whichever is **later**
- Tasks are created **up to a maximum of 60 days ahead**
- If an end date is provided, tasks **do not go past it**, even if it's less than 60 days away
- Each task represents 1 product on 1 day
- Tasks start as **"pending"**

### 3. User sees and completes tasks

The app shows:
- Tasks for **today** (calculated in user's timezone)
- Any **pending** tasks from yesterday that are **still within the allowed grace period** (24 hours after the deadline)

When the user marks a task as done:
- If it was done before the deadline → status becomes **"on-time"**
- If done after the deadline but within the 24-hour grace window → status becomes **"late"**
- If done after the grace period ends → it's **not allowed**

### 4. Daily background job (Future)

This is an automatic system job that:
- Checks for tasks that are still "pending" but their grace period has passed → marks them as **"missed"**
- Ensures each routine has tasks scheduled for **today and the next 60 days**
  - If any future days are missing, it adds them (only if they fall within the 60-day limit and the routine's end date)

**Status:** NOT IMPLEMENTED - Will be added in the future. For now, tasks are generated at publish time and when dates/products are updated.

---

## Edge Cases & Update Handling

### If the routine's start date is in the future

**Behavior:** No tasks are created until that date arrives.

### If the coach sets a start date in the past

**Behavior:** The system ignores the past and starts generating from **today**.

**Philosophy:** The system **never creates tasks in the past**.

### If the coach updates the start date FORWARD (e.g., Oct 31 → Nov 10)

**Behavior:**
- All **uncompleted** tasks between the old start date and the new one are **deleted**
- New tasks are generated starting from the new start date (or today, whichever is later), up to the 60-day cap

**Logic:**
```typescript
// Delete uncompleted tasks that are now before the new start date
await db.delete(routineStepCompletions)
  .where(
    and(
      eq(routineStepCompletions.routineId, routineId),
      lt(routineStepCompletions.scheduledDate, newStartDate),
      eq(routineStepCompletions.status, 'pending')
    )
  );

// Generate new tasks from newStartDate (or today) → effectiveStartDate + 60 days
const effectiveStartDate = max(newStartDate, today);
const windowEnd = addDays(effectiveStartDate, 60);
await generateCompletions(routineId, effectiveStartDate, windowEnd);
```

### If the coach updates the start date BACKWARD (e.g., Oct 31 → Oct 13)

**Behavior:**
- The system does **NOT** generate any new past tasks
- Already-generated tasks from today onward are kept

**Philosophy:** We preserve the "no tasks in the past" rule. Backfilling historical data is not supported.

### If the coach adds or edits a product

**Behavior:**
- For the affected product(s):
  - All **uncompleted** future tasks (from today onward) are deleted
  - New tasks are generated for those future days, based on the new frequency or time of day

**Logic:**
```typescript
// When product frequency/timeOfDay changes
await db.delete(routineStepCompletions)
  .where(
    and(
      eq(routineStepCompletions.routineProductId, productId),
      gte(routineStepCompletions.scheduledDate, today),
      eq(routineStepCompletions.status, 'pending')
    )
  );

// Regenerate tasks for this product: today → today + 60 days
const windowEnd = addDays(today, 60);
await generateCompletionsForProduct(productId, today, windowEnd);
```

### If the coach sets or updates the end date

**Behavior:**
- If the new end date is **earlier** than before:
  - All future tasks beyond that date are deleted
- If the new end date is **later**:
  - Additional days are added **only up to today + 60 days**

**Logic:**
```typescript
// If end date moves earlier
if (newEndDate < oldEndDate) {
  await db.delete(routineStepCompletions)
    .where(
      and(
        eq(routineStepCompletions.routineId, routineId),
        gt(routineStepCompletions.scheduledDate, newEndDate),
        eq(routineStepCompletions.status, 'pending')
      )
    );
}

// If end date moves later
if (newEndDate > oldEndDate) {
  const maxExistingDate = await getLatestCompletionDate(routineId);
  const gapStart = addDays(maxExistingDate, 1);
  const windowEnd = min(addDays(today, 60), newEndDate);

  if (gapStart <= windowEnd) {
    await generateCompletions(routineId, gapStart, windowEnd);
  }
}
```

---

## Implementation Design

### 60-Day Rolling Window Pattern

**Philosophy:** Only maintain a 60-day forward-looking window of tasks, not the entire routine lifespan.

#### On Publish: Generate 60-day window only

```typescript
async function publishRoutine(routineId: string) {
  const routine = await getRoutine(routineId);
  const user = await getUserProfile(routine.userProfileId);
  const products = await getRoutineProducts(routineId);

  // Calculate effective start date (never in the past)
  const today = new Date();
  const effectiveStartDate = max(routine.startDate, today);

  // Calculate window end (60 days from effective start, capped by end date if exists)
  const defaultWindowEnd = addDays(effectiveStartDate, 60);
  const windowEnd = routine.endDate
    ? min(defaultWindowEnd, routine.endDate)
    : defaultWindowEnd;

  // Generate completions: effectiveStartDate → windowEnd
  await generateCompletions(
    routineId,
    effectiveStartDate,
    windowEnd,
    products,
    user.timezone
  );

  // Result: Max 60 days × 7 products × 2 times/day = ~840 rows (vs 2,520 for 6 months)
}
```

#### On Update: Regenerate affected date ranges

```typescript
async function updateRoutine(routineId: string, updates: RoutineUpdates) {
  return await db.transaction(async (tx) => {
    const oldRoutine = await tx.select().from(routines).where(eq(routines.id, routineId));
    const updatedRoutine = await tx.update(routines).set(updates).where(eq(routines.id, routineId));

    if (updatedRoutine.status === 'published') {
      const today = new Date();
      const effectiveStartDate = max(updatedRoutine.startDate, today);
      const windowEnd = addDays(effectiveStartDate, 60);

      // Handle start date change FORWARD
      if (updates.startDate && updates.startDate > oldRoutine.startDate) {
        // Delete uncompleted tasks before new start date
        await tx.delete(routineStepCompletions)
          .where(
            and(
              eq(routineStepCompletions.routineId, routineId),
              lt(routineStepCompletions.scheduledDate, updates.startDate),
              eq(routineStepCompletions.status, 'pending')
            )
          );
      }

      // Handle start date change BACKWARD
      if (updates.startDate && updates.startDate < oldRoutine.startDate) {
        // Do nothing - we don't backfill past dates
      }

      // Handle end date change EARLIER
      if (updates.endDate && updates.endDate < oldRoutine.endDate) {
        await tx.delete(routineStepCompletions)
          .where(
            and(
              eq(routineStepCompletions.routineId, routineId),
              gt(routineStepCompletions.scheduledDate, updates.endDate),
              eq(routineStepCompletions.status, 'pending')
            )
          );
      }

      // Handle end date change LATER
      if (updates.endDate && updates.endDate > oldRoutine.endDate) {
        const maxExistingDate = await getLatestCompletionDate(tx, routineId);
        const gapStart = addDays(maxExistingDate, 1);
        const effectiveWindowEnd = min(windowEnd, updates.endDate);

        if (gapStart <= effectiveWindowEnd) {
          await generateCompletions(tx, routineId, gapStart, effectiveWindowEnd);
        }
      }
    }

    return updatedRoutine;
  });
}
```

#### On Product Update: Regenerate future tasks for product

```typescript
async function updateRoutineProduct(productId: string, updates: ProductUpdates) {
  return await db.transaction(async (tx) => {
    const product = await tx.select().from(routineProducts).where(eq(routineProducts.id, productId));
    const routine = await tx.select().from(routines).where(eq(routines.id, product.routineId));

    // Only regenerate if routine is published AND frequency/timeOfDay changed
    if (routine.status === 'published' &&
        (updates.frequency || updates.timeOfDay || updates.days)) {
      const today = new Date();
      const effectiveStartDate = max(routine.startDate, today);
      const windowEnd = addDays(effectiveStartDate, 60);

      // Delete uncompleted future tasks for this product
      await tx.delete(routineStepCompletions)
        .where(
          and(
            eq(routineStepCompletions.routineProductId, productId),
            gte(routineStepCompletions.scheduledDate, today),
            eq(routineStepCompletions.status, 'pending')
          )
        );

      // Update product
      await tx.update(routineProducts).set(updates).where(eq(routineProducts.id, productId));

      // Regenerate tasks for this product: today → windowEnd
      const updatedProduct = { ...product, ...updates };
      await generateCompletionsForProduct(
        tx,
        productId,
        today,
        min(windowEnd, routine.endDate ?? windowEnd),
        updatedProduct,
        user.timezone
      );
    }

    return await tx.update(routineProducts).set(updates).where(eq(routineProducts.id, productId));
  });
}
```

### Optimized Query Strategy

**Goal:** Avoid N+1 queries and use batch inserts.

#### Step 1: Fetch all products and user timezone

```typescript
const products = await db
  .select({
    id: routineProducts.id,
    frequency: routineProducts.frequency,
    days: routineProducts.days,
    timeOfDay: routineProducts.timeOfDay,
    order: routineProducts.order,
  })
  .from(routineProducts)
  .where(eq(routineProducts.routineId, routineId));

const user = await db
  .select({ timezone: userProfiles.timezone })
  .from(userProfiles)
  .where(eq(userProfiles.id, userProfileId))
  .limit(1);
```

#### Step 2: Build completions array in memory

```typescript
const completionsToInsert: NewRoutineStepCompletion[] = [];
let currentDate = new Date(startDate);

while (currentDate <= endDate) {
  for (const product of products) {
    if (shouldGenerateForDate(
      { frequency: product.frequency, days: product.days },
      currentDate
    )) {
      const { onTimeDeadline, gracePeriodEnd } = calculateDeadlines(
        currentDate,
        product.timeOfDay,
        user.timezone
      );

      completionsToInsert.push({
        routineProductId: product.id,
        userProfileId,
        scheduledDate: new Date(currentDate),
        scheduledTimeOfDay: product.timeOfDay,
        onTimeDeadline,
        gracePeriodEnd,
        status: 'pending',
        completedAt: null,
      });
    }
  }
  currentDate = addDays(currentDate, 1);
}
```

**Key:** All calculations done in-memory, no database calls inside loops.

#### Step 3: Single batch insert

```typescript
if (completionsToInsert.length > 0) {
  // Drizzle generates: INSERT INTO ... VALUES (...), (...), (...)
  await db.insert(routineStepCompletions).values(completionsToInsert);
}
```

**Performance:** One INSERT with multiple VALUES, not N individual INSERTs.

---

## Task Tracking Summary

Every routine task has:
- A specific **date** (e.g., Nov 12)
- A specific **product** (e.g., "SPF")
- A **status**:
  - **pending** = not completed yet
  - **on-time** = completed before the deadline
  - **late** = completed after deadline but within grace
  - **missed** = not completed by the time grace period ends
- A **deadline** = when the user was supposed to complete it (calculated in user's timezone)
- A **grace period** = 24 hours after the deadline (timezone-aware)

---

## Timezone Handling

All deadline calculations are done in the **user's timezone**, not server UTC.

### Example: Nairobi User (UTC+3)

```typescript
// User in Nairobi timezone
const user = { timezone: "Africa/Nairobi" };

// Task scheduled for Oct 31, morning
const scheduledDate = new Date("2025-10-31");
const timeOfDay = "morning";

// calculateDeadlines returns times in user's timezone
const { onTimeDeadline, gracePeriodEnd } = calculateDeadlines(
  scheduledDate,
  timeOfDay,
  user.timezone
);

// onTimeDeadline = 2025-10-31 12:00:00 EAT (09:00:00 UTC)
// gracePeriodEnd = 2025-11-01 12:00:00 EAT (09:00:00 UTC)
```

### getTodayRoutineSteps - Timezone Awareness

When fetching "today's" tasks, the system calculates "today" based on the user's timezone:

```typescript
// User in Nairobi (UTC+3) at 3:00 AM local time
// Server UTC time: 2025-10-31 00:03:00 UTC
// User's local time: 2025-10-31 03:03:00 EAT

// System correctly returns Oct 31 tasks (user's "today")
const todayTasks = await getTodayRoutineSteps(userId, serverUTC);
```

See implementation: `src/app/api/consumer-app/dashboard/dashboard.repo.ts:105-175`

---

## System Guarantees

- A routine **never starts before its start date**
- The system **never creates tasks in the past**
- Tasks are **only created from today (or start date) → up to 60 days ahead**
- The **end date (if set)** is a hard stop — no tasks beyond it
- All status updates are handled automatically over time (through future cron job)
- All deadlines and "today" calculations are **timezone-aware** based on user's timezone

---

## Performance Characteristics

### Query Count

**For publish routine (60-day window):**
- 3 queries total:
  1. SELECT (products)
  2. SELECT (user timezone)
  3. INSERT (batch all completions - max ~840 rows)

**For update routine with date change:**
- 4-5 queries total:
  1. SELECT (old routine data)
  2. UPDATE (routine metadata)
  3. DELETE (uncompleted tasks outside new range, if needed)
  4. SELECT (existing completion date range, if extending)
  5. INSERT (batch new completions, if extending)

### Example: 60-day window with 7 products

- **With 60-day window:** 60 days × 7 products × 2 times/day = ~840 rows per user
- **Old approach (6 months):** 180 days × 7 products × 2 times/day = ~2,520 rows per user
- **Reduction:** 66% fewer rows, faster updates

---

## Benefits of 60-Day Rolling Window

✅ **Constant database size per user** (~840 rows max vs 2,520+)
✅ **Faster product updates** (60 days of rewrites vs 6 months)
✅ **Supports indefinite routines** (window can be extended by future cron)
✅ **Lighter database load** (no mass deletes/inserts)
✅ **No wasted storage** for tasks months in the future

---

## Trade-offs

⚠️ **No historical backfill** - If admin backdates routine start, system doesn't create past tasks
⚠️ **Requires future cron job** - Need scheduled task to extend windows and mark missed tasks
⚠️ **More complexity** - More moving parts than simple "generate everything upfront"

---

## Related Code

- **Publish routine:** `src/app/(dashboard)/subscribers/[id]/routine-info-actions/actions.ts` (line 256)
- **Update routine:** `src/app/(dashboard)/subscribers/[id]/routine-info-actions/actions.ts` (line 137)
- **Compliance utils:** `src/lib/compliance-utils.ts` (`shouldGenerateForDate`, `calculateDeadlines`)
- **Dashboard API (timezone-aware):** `src/app/api/consumer-app/dashboard/dashboard.repo.ts` (`getTodayRoutineSteps`)

---

## Current Implementation Status

### ✅ Implemented (2025-11-01)
- **60-day rolling window** in `publishRoutine()` ✅ (`actions.ts:310-324`)
  - Changed from 6-month window to 60-day window
  - Implements `effectiveStartDate = max(routine.startDate, today)`
  - Never creates tasks in the past (normalizes to UTC midnight)
  - Respects end date when < 60 days
  - Caps at 60 days when end date > 60 days
  - Uses inclusive date ranges for end dates
- **Database transaction support** ✅ (`actions.ts:363-386`)
  - Dependency injection pattern for all database operations
  - Single atomic transaction for status update + task generation
  - Prevents data corruption if transaction fails mid-operation
- **Repository testability** ✅
  - `makeRoutineRepo({ db })` - accepts test database
  - `makeRoutineProductsRepo({ db })` - accepts test database
  - `makeUserProfileRepo({ db })` - accepts test database
- Timezone-aware deadline calculation (`calculateDeadlines`)
- Timezone-aware "today" calculation (`getTodayRoutineSteps`)
- Task status tracking (pending, on-time, late, missed)
- **Test coverage:**
  - Helper function tests: ✅ 7/7 passing (`compliance-utils.unit.test.ts`)
  - publishRoutine() integration tests: ✅ 15/15 passing (`actions.test.ts`)
    - 60-day window scenarios (3 tests)
    - End date boundary cases (3 tests)
    - Edge cases with multiple products (3 tests)
    - Timezone handling (2 tests)
    - Validation & error handling (4 tests)

### ⚠️ Needs Implementation
- [ ] Implement regeneration logic in `updateRoutine()` for date changes
- [ ] Implement regeneration logic in `updateRoutineProduct()` for product changes
- [ ] Handle end date updates (delete/add tasks)
- [ ] Write tests for updateRoutine() (12 tests planned)
- [ ] Write tests for updateRoutineProduct() (15 tests planned)

### 🔮 Future Enhancements
- [ ] Daily cron job to extend 60-day window forward
- [ ] Daily cron job to mark expired pending tasks as "missed"
- [ ] Batch processing for very large date ranges (if needed)

---

**Last Updated:** 2025-11-01

---

## Key Learnings from Implementation

### Date Normalization (Critical!)

When working with date comparisons for task generation, **always normalize to UTC midnight**:

```typescript
/**
 * Normalize date to midnight UTC (removes time component)
 * This ensures consistent date comparisons regardless of time zones
 */
function toMidnightUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
```

**Why this matters:**
- Test dates like `new Date("2025-10-31")` create dates at midnight UTC
- `now()` returns current time with hours/minutes/seconds
- Without normalization: Oct 31 10:00 AM + 60 days = Dec 30 10:00 AM
- With `<=` comparison against Dec 30 00:00: You get 59 days instead of 60!

**DO NOT use** `startOfDay()` from date-fns - it converts to local timezone, causing off-by-one errors when tests run in different timezones.

### Inclusive vs Exclusive Ranges

For the 60-day window:
- **60 days** means day 0 through day 59 (inclusive)
- Use `addDays(start, 59)` + `while (current <= end)` for inclusive loops
- For explicit end dates, users expect the end date to be **included**

### Transaction Injection Pattern

From `TESTING.md`:
```typescript
// Add db to deps type
export type PublishRoutineDeps = {
  db: typeof db;  // ← Must be injectable
  // ... other deps
};

// Use deps.db for all operations
const result = await deps.db.transaction(async (tx) => {
  // Both operations in one transaction
  await tx.update(routines).set({...});
  await tx.insert(completions).values([...]);
});
```

This ensures test databases (PGlite) can be injected without modifying production code.

**Last Updated:** 2025-11-01
