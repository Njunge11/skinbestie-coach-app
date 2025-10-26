# Mutation Performance Issues (INSERTs, UPDATEs, DELETEs)

> Audit of all write operations for performance issues
>
> Date: January 2025
> Status: 🔴 **3 CRITICAL ISSUES FOUND**

---

## 🔴 CRITICAL: Drag-and-Drop Reordering (2N Individual UPDATEs)

**Severity**: 🔴 CRITICAL
**Impact**: 20 individual UPDATE queries for reordering 10 items
**User-Facing**: YES - happens on every drag-and-drop
**Files Affected**: 3 repos

### Issue Description

All three repos with reordering use the SAME inefficient `updateMany` pattern:

```typescript
async updateMany(updates: Array<{ id: string; data: Partial<T> }>): Promise<void> {
  // Step 1: Set all to temporary negative orders (N queries)
  for (let i = 0; i < updates.length; i++) {
    await db.update(table).set({ order: -(i + 1) }).where(eq(table.id, id));  // ❌
  }

  // Step 2: Set final order values (N more queries)
  for (const { id, data } of updates) {
    await db.update(table).set(data).where(eq(table.id, id));  // ❌
  }
}
```

**Problem**: **2N individual UPDATE queries** where N is the number of items being reordered.

**Real-World Impact**:
- Reordering 5 routine products = 10 UPDATE queries
- Reordering 10 goals = 20 UPDATE queries
- Reordering 15 template products = 30 UPDATE queries

**No transaction wrapping** - if Step 2 fails, Step 1 is already committed (data corruption)

---

### Fix #1: Batch SQL UPDATE with CASE Statement

Use the SAME pattern as the seeder (src/scripts/seed-profiles.ts:354-361):

```typescript
async updateMany(
  updates: Array<{ id: string; data: Partial<T> }>
): Promise<void> {
  if (updates.length === 0) return;

  // Build CASE statements for batch update
  const ids = updates.map((u) => `'${u.id}'`).join(", ");

  const orderCases = updates
    .map((u) => `WHEN '${u.id}' THEN ${u.data.order}`)
    .join(" ");

  const updatedAtCases = updates
    .map((u) => `WHEN '${u.id}' THEN '${u.data.updatedAt.toISOString()}'`)
    .join(" ");

  // Single batch UPDATE query
  await db.execute(sql.raw(`
    UPDATE table_name
    SET
      "order" = (CASE id ${orderCases} END),
      updated_at = (CASE id ${updatedAtCases} END)::timestamp
    WHERE id IN (${ids})
  `));
}
```

**Performance Gain**: **2N queries → 1 query** (10x-20x faster)

---

### Fix #2: Use Transaction Wrapper (Safer Alternative)

If batch SQL is too complex, at minimum wrap in a transaction:

```typescript
async updateMany(
  updates: Array<{ id: string; data: Partial<T> }>
): Promise<void> {
  await db.transaction(async (tx) => {
    // Step 1: Set temporary negative orders
    for (let i = 0; i < updates.length; i++) {
      const { id, data } = updates[i];
      await tx
        .update(table)
        .set({ order: -(i + 1), updatedAt: data.updatedAt })
        .where(eq(table.id, id));
    }

    // Step 2: Set final order values
    for (const { id, data } of updates) {
      await tx.update(table).set(data).where(eq(table.id, id));
    }
  });
}
```

**Benefits**:
- Atomic operation (all or nothing)
- Prevents data corruption if error occurs
- Still 2N queries, but safer

**Performance**: Same speed, but prevents corruption

---

## Affected Files

### 1. Routine Products Reordering

**File**: `src/app/(dashboard)/subscribers/[id]/routine-actions/routine.repo.ts`
**Lines**: 94-117
**Table**: `skincare_routine_products`
**Function**: `updateMany()`

**Used By**: `reorderRoutineProducts()` in actions.ts (line 454)

**Fix Required**: Replace lines 94-117 with batch SQL UPDATE

**Current Code**:
```typescript
async updateMany(
  updates: Array<{ id: string; data: Partial<RoutineProduct> }>
): Promise<void> {
  // Step 1: Set all products to temporary negative orders
  for (let i = 0; i < updates.length; i++) {
    const { id, data } = updates[i];
    await db
      .update(skincareRoutineProducts)
      .set({ order: -(i + 1), updatedAt: data.updatedAt })
      .where(eq(skincareRoutineProducts.id, id));
  }

  // Step 2: Set final order values
  for (const { id, data } of updates) {
    await db
      .update(skincareRoutineProducts)
      .set(data)
      .where(eq(skincareRoutineProducts.id, id));
  }
}
```

**Fixed Code**:
```typescript
import { sql } from "drizzle-orm";

async updateMany(
  updates: Array<{ id: string; data: Partial<RoutineProduct> }>
): Promise<void> {
  if (updates.length === 0) return;

  const ids = updates.map((u) => `'${u.id}'`).join(", ");

  const orderCases = updates
    .map((u) => `WHEN '${u.id}' THEN ${u.data.order}`)
    .join(" ");

  const updatedAtCases = updates
    .map((u) => `WHEN '${u.id}' THEN '${u.data.updatedAt?.toISOString()}'`)
    .join(" ");

  await db.execute(sql.raw(`
    UPDATE skincare_routine_products
    SET
      "order" = (CASE id ${orderCases} END),
      updated_at = (CASE id ${updatedAtCases} END)::timestamp
    WHERE id IN (${ids})
  `));
}
```

---

### 2. Goals Reordering

**File**: `src/app/(dashboard)/subscribers/[id]/goal-actions/goals.repo.ts`
**Lines**: 49-70
**Table**: `skincare_goals`
**Function**: `updateMany()`

**Used By**: `reorderGoals()` in actions.ts

**Fix Required**: Replace lines 49-70 with batch SQL UPDATE

**Current Code**:
```typescript
async updateMany(updates: Array<{ id: string; data: Partial<Goal> }>): Promise<void> {
  // Step 1: Set all goals to temporary negative orders
  for (let i = 0; i < updates.length; i++) {
    const { id, data } = updates[i];
    await db
      .update(skincareGoals)
      .set({ order: -(i + 1), updatedAt: data.updatedAt })
      .where(eq(skincareGoals.id, id));
  }

  // Step 2: Set final order values
  for (const { id, data } of updates) {
    await db
      .update(skincareGoals)
      .set(data)
      .where(eq(skincareGoals.id, id));
  }
}
```

**Fixed Code**:
```typescript
import { sql } from "drizzle-orm";

async updateMany(
  updates: Array<{ id: string; data: Partial<Goal> }>
): Promise<void> {
  if (updates.length === 0) return;

  const ids = updates.map((u) => `'${u.id}'`).join(", ");

  const orderCases = updates
    .map((u) => `WHEN '${u.id}' THEN ${u.data.order}`)
    .join(" ");

  const updatedAtCases = updates
    .map((u) => `WHEN '${u.id}' THEN '${u.data.updatedAt?.toISOString()}'`)
    .join(" ");

  await db.execute(sql.raw(`
    UPDATE skincare_goals
    SET
      "order" = (CASE id ${orderCases} END),
      updated_at = (CASE id ${updatedAtCases} END)::timestamp
    WHERE id IN (${ids})
  `));
}
```

---

### 3. Template Products Reordering

**File**: `src/app/(dashboard)/routine-management/template-actions/template.repo.ts`
**Lines**: 135-158
**Table**: `routine_template_products`
**Function**: `updateManyProducts()`

**Used By**: `reorderTemplateProducts()` in actions.ts

**Fix Required**: Replace lines 135-158 with batch SQL UPDATE

**Current Code**:
```typescript
async updateManyProducts(
  updates: Array<{ id: string; data: Partial<RoutineTemplateProduct> }>
): Promise<void> {
  // Step 1: Set all products to temporary negative orders
  for (let i = 0; i < updates.length; i++) {
    const { id, data } = updates[i];
    await db
      .update(routineTemplateProducts)
      .set({ order: -(i + 1), updatedAt: data.updatedAt })
      .where(eq(routineTemplateProducts.id, id));
  }

  // Step 2: Set final order values
  for (const { id, data } of updates) {
    await db
      .update(routineTemplateProducts)
      .set(data)
      .where(eq(routineTemplateProducts.id, id));
  }
}
```

**Fixed Code**:
```typescript
import { sql } from "drizzle-orm";

async updateManyProducts(
  updates: Array<{ id: string; data: Partial<RoutineTemplateProduct> }>
): Promise<void> {
  if (updates.length === 0) return;

  const ids = updates.map((u) => `'${u.id}'`).join(", ");

  const orderCases = updates
    .map((u) => `WHEN '${u.id}' THEN ${u.data.order}`)
    .join(" ");

  const updatedAtCases = updates
    .map((u) => `WHEN '${u.id}' THEN '${u.data.updatedAt?.toISOString()}'`)
    .join(" ");

  await db.execute(sql.raw(`
    UPDATE routine_template_products
    SET
      "order" = (CASE id ${orderCases} END),
      updated_at = (CASE id ${updatedAtCases} END)::timestamp
    WHERE id IN (${ids})
  `));
}
```

---

## ✅ Good Patterns Found (No Issues)

### Single INSERT with .returning()

All CREATE operations properly use `.returning()`:

```typescript
async create(product: NewRoutineProduct): Promise<RoutineProduct> {
  const [newProduct] = await db
    .insert(skincareRoutineProducts)
    .values(product)
    .returning();  // ✅ Good

  return newProduct as RoutineProduct;
}
```

**Status**: ✅ No issues - this is the correct pattern

---

### Single UPDATE with .returning()

All UPDATE operations properly use `.returning()`:

```typescript
async update(
  productId: string,
  updates: Partial<RoutineProduct>
): Promise<RoutineProduct | null> {
  const [updatedProduct] = await db
    .update(skincareRoutineProducts)
    .set(updates)
    .where(eq(skincareRoutineProducts.id, productId))
    .returning();  // ✅ Good

  return updatedProduct ? (updatedProduct as RoutineProduct) : null;
}
```

**Status**: ✅ No issues - this is the correct pattern

---

### Single DELETE with .returning()

All DELETE operations properly use `.returning()`:

```typescript
async deleteById(productId: string): Promise<RoutineProduct | null> {
  const [deletedProduct] = await db
    .delete(skincareRoutineProducts)
    .where(eq(skincareRoutineProducts.id, productId))
    .returning();  // ✅ Good

  return deletedProduct ? (deletedProduct as RoutineProduct) : null;
}
```

**Status**: ✅ No issues - this is the correct pattern

---

## Summary

| Issue | Files | Impact | User-Facing | Priority |
|-------|-------|--------|-------------|----------|
| 2N UPDATE queries in updateMany | 3 repos | 10-20x slower | YES (drag-drop) | 🔴 CRITICAL |

**Total Files to Fix**: 3 repo files

**Expected Performance Gain**: 10-20x faster drag-and-drop operations

**Fix Complexity**: Medium (requires batch SQL with CASE statements)

**Data Integrity Risk**: HIGH (current code has no transaction wrapping)

---

## Recommended Fix Order

1. ✅ Fix `routine.repo.ts` updateMany (most commonly used)
2. ✅ Fix `goals.repo.ts` updateMany
3. ✅ Fix `template.repo.ts` updateManyProducts

**After Each Fix**:
- Run existing tests to verify behavior unchanged
- Test drag-and-drop manually
- Verify performance improvement

---

## Testing Strategy

For each fixed `updateMany` function:

1. **Unit Test** - Verify single SQL query executed (not 2N queries)
2. **Integration Test** - Verify final order values are correct
3. **Edge Case Test** - Verify empty array doesn't error
4. **Performance Test** - Benchmark 10 items (should be <10ms)

---

## Alternative: Use Drizzle's Batch API (If Available)

Check if Drizzle supports batch operations natively:

```typescript
// If Drizzle supports this pattern:
await db.batch([
  db.update(table).set({ order: 0 }).where(eq(table.id, id1)),
  db.update(table).set({ order: 1 }).where(eq(table.id, id2)),
  // ...
]);
```

**Note**: As of Drizzle ORM v0.31.0, batch API may be limited. Verify in docs.

---

## References

- [Drizzle ORM - Batch Operations](https://orm.drizzle.team/docs/batch-api)
- [PostgreSQL - UPDATE with CASE](https://www.postgresql.org/docs/current/sql-update.html)
- [DATABASE_GUIDE.md](./DATABASE_GUIDE.md) - Query Optimization section
- [Seeder Implementation](../src/scripts/seed-profiles.ts:354-361) - Working example

---

**End of Mutation Audit**
