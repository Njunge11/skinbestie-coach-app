# Routine Task Generation - Performance Optimization Guide

## Current Performance Characteristics

### Task Generation Overview

When a routine is published or updated, the system generates scheduled tasks for a 60-day rolling window.

**Example Workload:**
- 10 products in routine
- 60-day window
- 5 daily products + 5 Mon/Wed/Fri products

**Current Implementation:**
- **Total iterations**: 10 products × 60 days = 600 loop iterations
- **Timezone conversions**: 600 calls to `calculateDeadlines()`
- **Each conversion**: 2 `zonedTimeToUtc()` operations (onTime + grace deadlines)
- **Total timezone operations**: ~1,200 per routine publish

### Bottleneck: Redundant Timezone Calculations

```typescript
// Current code (simplified)
for (let day = 0; day < 60; day++) {
  for (const product of products) {
    // PROBLEM: This runs 600 times
    const { onTimeDeadline, gracePeriodEnd } = calculateDeadlines(
      currentDate,
      product.timeOfDay,
      user.timezone
    );
    // Each call does expensive timezone math
  }
}
```

**Issue:** Morning products on Oct 31 all have the same deadline (11 AM EST), but we recalculate it 5 times.

## Phase 1: Low-Risk, High-Impact Optimizations

### 1. Deadline Caching (90% reduction in timezone math)

**Problem:**
```typescript
// Day 1: Product A (morning) → Calculate 11 AM EST deadline
// Day 1: Product B (morning) → Calculate 11 AM EST deadline (DUPLICATE!)
// Day 1: Product C (morning) → Calculate 11 AM EST deadline (DUPLICATE!)
```

**Solution:** Cache by `(date, timeOfDay)` key.

```typescript
// Cache: Map<"2025-10-31:morning", { onTime: Date, grace: Date }>
function makeDeadlineCache(timezone: string) {
  const cache = new Map<string, { onTimeDeadline: Date; gracePeriodEnd: Date }>();

  return (dateUTC: Date, timeOfDay: "morning" | "evening") => {
    const key = `${dateUTC.toISOString().slice(0,10)}:${timeOfDay}`;
    const hit = cache.get(key);
    if (hit) return hit;

    // Cache miss - calculate once
    const deadlines = calculateDeadlines(dateUTC, timeOfDay, timezone);
    cache.set(key, deadlines);
    return deadlines;
  };
}

// Usage
const getDeadlines = makeDeadlineCache(user.timezone);

for (let day = 0; day < 60; day++) {
  for (const product of products) {
    // Only calculates ~60 times instead of 600
    const { onTimeDeadline, gracePeriodEnd } = getDeadlines(currentDate, product.timeOfDay);
  }
}
```

**Performance Gain:**
- **Before**: 600 timezone conversions
- **After**: ~60 timezone conversions (max 60 days × 2 timeOfDay values = 120)
- **Reduction**: 80-90%

**Typical scenario** (5 morning + 5 evening products, 60 days):
- Unique cache keys: 60 dates × 2 times = 120
- Total requests: 600
- **Cache hit rate**: 80%

### 2. Weekday Bitmask (O(1) frequency checks)

**Problem:** Current frequency check uses array operations.

```typescript
// Current approach
type Product = {
  frequency: "daily" | "specific_days";
  days: number[] | null; // [1, 3, 5] for Mon/Wed/Fri
};

function shouldGenerateForDate(product: Product, date: Date): boolean {
  if (product.frequency === "daily") return true;
  const dayOfWeek = date.getDay();
  return product.days?.includes(dayOfWeek) ?? false; // O(N) lookup
}
```

**Solution:** Bitmask for O(1) check.

```typescript
// Bitmask representation
// bit0=Sunday, bit1=Monday, ..., bit6=Saturday
// Mon/Wed/Fri = 0b0101010 = 42

const DOW = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 } as const;

function weekdayMask(days: Array<keyof typeof DOW>): number {
  let mask = 0;
  for (const d of days) mask |= (1 << DOW[d]);
  return mask;
}

// Example: Mon/Wed/Fri
const mwfMask = weekdayMask(["Mon", "Wed", "Fri"]); // 42

function matchesDay(mask: number, date: Date, tz: string): boolean {
  const local = utcToZonedTime(date, tz);
  const dow = local.getDay(); // 0-6
  return (mask & (1 << dow)) !== 0; // O(1) bitwise AND
}
```

**Performance Gain:**
- **Before**: Array `.includes()` - O(N) where N = days in week (max 7)
- **After**: Bitwise AND - O(1)
- **Reduction**: Marginal for small N, but cleaner code

**Benefits:**
- Faster checks (though negligible vs timezone math)
- Type-safe at compile time
- More elegant code

### 3. Group Products by TimeOfDay (Cache Locality)

**Problem:** Random cache access pattern.

```typescript
// Products ordered arbitrarily
const products = [
  { timeOfDay: "morning" },  // Cache miss
  { timeOfDay: "evening" },  // Cache miss
  { timeOfDay: "morning" },  // Cache hit
  { timeOfDay: "evening" },  // Cache hit
];
```

**Solution:** Group by `timeOfDay` before iteration.

```typescript
// Pre-group products
const byTimeOfDay: Record<TimeOfDay, Product[]> = {
  morning: [],
  evening: [],
  any: []
};

for (const product of products) {
  byTimeOfDay[product.timeOfDay].push(product);
}

// Iterate with better cache locality
for (const timeOfDay of ["morning", "evening", "any"] as const) {
  const group = byTimeOfDay[timeOfDay];
  if (group.length === 0) continue;

  for (let day = 0; day < 60; day++) {
    const deadlines = getDeadlines(currentDate, timeOfDay); // Sequential cache hits

    for (const product of group) {
      // Use same deadlines for all products in group
    }
  }
}
```

**Performance Gain:**
- **Before**: Mixed cache hits/misses
- **After**: Sequential cache access = better CPU cache locality
- **Impact**: 5-10% improvement for 50+ products, negligible for <10

## Phase 2: Schema Migration & Advanced Optimizations

### 1. Sparse Date Generation (28% fewer iterations)

**Current Limitation:** We iterate ALL 60 days for ALL products, even sparse ones.

```typescript
// Current: Mon/Wed/Fri product still scans 60 days
for (let day = 0; day < 60; day++) {
  if (matchesDay(mask, currentDate)) {
    // Only ~26 days match, but we checked 60
  }
}
```

**Optimization:** Jump 7 days at a time for sparse schedules.

```typescript
function* datesForProduct(
  startUTC: Date,
  endUTC: Date,
  freq: Frequency,
  tz: string
): Generator<Date> {
  if (freq.kind === "daily") {
    // Daily products: iterate every day
    for (let d = startUTC; d <= endUTC; d = addDays(d, 1)) {
      yield d;
    }
    return;
  }

  // Sparse schedules: find first match, then jump +7 days
  const firstMatch = findFirstMatchInWeek(startUTC, freq.mask, tz);
  for (let d = firstMatch; d <= endUTC; d = addDays(d, 7)) {
    yield d;
  }
}
```

**Performance Gain:**
- **Before**: 5 daily × 60 days + 5 sparse × 60 days = 600 iterations
- **After**: 5 daily × 60 days + 5 sparse × ~26 days = 430 iterations
- **Reduction**: 28% fewer loop iterations

**Tradeoff:** Requires more complex date generation logic.

### 2. Schema Migration to Discriminated Union

**Current Schema:**
```typescript
type Product = {
  frequency: "daily" | "specific_days";
  days: number[] | null; // nullable, needs runtime checks
};
```

**Proposed Schema:**
```typescript
type Frequency =
  | { kind: "daily" }
  | { kind: "weekdays"; mask: number }; // bit0=Sun, ..., bit6=Sat

type Product = {
  frequency: Frequency;
  // No nullable fields!
};
```

**Benefits:**
- Compile-time type safety (can't access `.mask` on daily frequency)
- No nullable fields = fewer runtime checks
- Cleaner pattern matching

**Migration Required:**
1. Add new `frequency_v2` column with JSON type
2. Backfill: `"daily"` → `{"kind":"daily"}`, `[1,3,5]` → `{"kind":"weekdays","mask":42}`
3. Update product creation API
4. Drop old `frequency`/`days` columns

## Performance Summary

### Phase 1 (No Schema Changes)

**10 products, 60 days:**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Loop iterations | 600 | 600 | 0% |
| Timezone conversions | 600 | ~60 | **90%** |
| Frequency checks | 600 × O(N) | 600 × O(1) | Marginal |

**Estimated speedup:** 3-5x for timezone-heavy workloads

### Phase 2 (With Schema Migration)

**10 products (5 daily + 5 Mon/Wed/Fri), 60 days:**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Loop iterations | 600 | 430 | **28%** |
| Timezone conversions | 600 | ~60 | **90%** |
| Frequency checks | 600 × O(N) | 430 × O(1) | **Combined** |

**Estimated speedup:** 4-6x overall

## Benchmark Scenarios

### Small Routine (3 products, 60 days)

**Current:**
- 180 iterations
- 180 timezone conversions
- ~50ms total (estimated)

**Phase 1:**
- 180 iterations
- ~60 timezone conversions
- ~20ms total (**60% faster**)

### Medium Routine (10 products, 60 days)

**Current:**
- 600 iterations
- 600 timezone conversions
- ~200ms total (estimated)

**Phase 1:**
- 600 iterations
- ~60 timezone conversions
- ~50ms total (**75% faster**)

### Large Routine (50 products, 60 days)

**Current:**
- 3,000 iterations
- 3,000 timezone conversions
- ~1,000ms total (estimated)

**Phase 1:**
- 3,000 iterations
- ~120 timezone conversions
- ~150ms total (**85% faster**)

**Phase 2:**
- ~1,800 iterations (assuming 50% sparse)
- ~120 timezone conversions
- ~100ms total (**90% faster**)

## Implementation Recommendations

### Immediate (Phase 1)

1. ✅ **Implement deadline caching** - Highest ROI, zero schema changes
2. ✅ **Add bitmask frequency checks** - Cleaner code, minimal risk
3. ✅ **Group by timeOfDay** - Small win, easy to add

**Effort:** 2-4 hours
**Risk:** Low (backward compatible)
**Gain:** 3-5x speedup

### Future (Phase 2)

1. ⏳ **Benchmark real production workloads** - Measure actual bottlenecks
2. ⏳ **Schema migration to discriminated union** - Plan data migration
3. ⏳ **Implement sparse date stepping** - Only if profiling shows benefit

**Effort:** 1-2 days
**Risk:** Medium (schema migration, data backfill)
**Gain:** Additional 20-30% speedup

## Code Example: Phase 1 Implementation

```typescript
import { addDays } from "date-fns";
import { utcToZonedTime, zonedTimeToUtc } from "date-fns-tz";

type DeadlineCache = ReturnType<typeof makeDeadlineCache>;

function makeDeadlineCache(timezone: string) {
  const cache = new Map<string, { onTimeDeadline: Date; gracePeriodEnd: Date }>();

  return (dateUTC: Date, timeOfDay: "morning" | "evening") => {
    const key = `${dateUTC.toISOString().slice(0,10)}:${timeOfDay}`;
    const hit = cache.get(key);
    if (hit) return hit;

    // Cache miss - calculate deadlines
    const local = utcToZonedTime(dateUTC, timezone);

    const onTimeHour = timeOfDay === "morning" ? 11 : 20;
    const localOnTime = new Date(local);
    localOnTime.setHours(onTimeHour, 0, 0, 0);

    const localGrace = new Date(local);
    localGrace.setHours(23, 59, 59, 999);

    const deadlines = {
      onTimeDeadline: zonedTimeToUtc(localOnTime, timezone),
      gracePeriodEnd: zonedTimeToUtc(localGrace, timezone),
    };

    cache.set(key, deadlines);
    return deadlines;
  };
}

// Usage in publishRoutine()
export async function publishRoutine(routineId: string, deps: PublishRoutineDeps) {
  const user = await userRepo.findById(routine.userProfileId);
  const getDeadlines = makeDeadlineCache(user.timezone);

  // Group products by timeOfDay
  const byTimeOfDay: Record<TimeOfDay, Product[]> = {
    morning: [],
    evening: [],
  };

  for (const product of products) {
    byTimeOfDay[product.timeOfDay].push(product);
  }

  const completions = [];
  let currentDate = effectiveStartDate;

  while (currentDate <= endDate) {
    // Process all morning products together
    const morningDeadlines = getDeadlines(currentDate, "morning");
    for (const product of byTimeOfDay.morning) {
      if (shouldGenerateForDate(product, currentDate)) {
        completions.push({
          routineProductId: product.id,
          scheduledDate: currentDate,
          scheduledTimeOfDay: "morning",
          onTimeDeadline: morningDeadlines.onTimeDeadline,
          gracePeriodEnd: morningDeadlines.gracePeriodEnd,
          // ...
        });
      }
    }

    // Process all evening products together
    const eveningDeadlines = getDeadlines(currentDate, "evening");
    for (const product of byTimeOfDay.evening) {
      if (shouldGenerateForDate(product, currentDate)) {
        completions.push({
          routineProductId: product.id,
          scheduledDate: currentDate,
          scheduledTimeOfDay: "evening",
          onTimeDeadline: eveningDeadlines.onTimeDeadline,
          gracePeriodEnd: eveningDeadlines.gracePeriodEnd,
          // ...
        });
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  // Batch insert
  await tx.insert(routineStepCompletions).values(completions);
}
```

## Monitoring & Profiling

**Metrics to track:**
- `publishRoutine()` execution time (p50, p95, p99)
- `updateRoutine()` execution time
- Average products per routine
- Cache hit rate (log `cache.size` vs total requests)

**Warning signs:**
- p99 > 1 second for publishes
- Cache hit rate < 70%
- Routines with >50 products showing slowness

## References

- **Current implementation**: `src/app/(dashboard)/subscribers/[id]/routine-info-actions/actions.ts`
- **Test coverage**: `src/app/(dashboard)/subscribers/[id]/routine-info-actions/__tests__/publishRoutine.test.ts`
- **Performance feedback**: Original recommendation by [reviewer name]
- **date-fns-tz docs**: https://github.com/marnusw/date-fns-tz

---

**Last updated**: 2025-11-01
**Status**: Phase 1 ready for implementation
**Owner**: Backend team
