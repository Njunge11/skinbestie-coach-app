# 🔴 CRITICAL: Transaction Implementations Are Broken

> **Status**: CRITICAL BUG - Data integrity at risk
> **Severity**: HIGH - Silent data corruption possible
> **Date Discovered**: 2025-01-20
> **Root Cause**: Mixing `tx` object with global `db` in transaction callbacks

---

## The Problem

**All transaction implementations I created are BROKEN.** They call repo methods and helper functions that use the global `db` object instead of the transaction `tx` object. **These operations do NOT participate in the transaction and will NOT rollback on error.**

### Official Source

From web search results on Drizzle ORM transactions:

> "If you use the regular `db` object instead of `tx` for some queries within a transaction callback, those queries will execute on a different database connection and **won't be part of the transaction**, meaning they won't rollback if an error occurs."

**Source**: Stack Overflow verified answer on Drizzle ORM transactions
**Search Query**: "Drizzle ORM transaction must use tx object all queries or rollback fails"
**Date**: 2025-01-20

### Why This Matters

When you use `db.transaction(async (tx) => { ... })`:
- ✅ Operations using `tx` object execute on the same connection and participate in the transaction
- ❌ Operations using global `db` execute on a DIFFERENT connection and do NOT participate
- ❌ If transaction rolls back, global `db` operations remain committed
- ❌ This causes **silent data corruption**

---

## Broken Files

### 1. `src/app/(dashboard)/subscribers/[id]/routine-actions/actions.ts`

**Function**: `createRoutineProduct` (lines 214-304)

**Problem**:
```typescript
await db.transaction(async (tx) => {
  // ❌ Uses global db - NOT in transaction!
  const routine = await routineRepo.findById(validation.data.routineId);

  // ✅ Uses tx - in transaction
  const [createdProduct] = await tx
    .insert(skincareRoutineProducts)
    .values(newProduct)
    .returning();

  // ❌ Uses global db - NOT in transaction!
  if (routine.status === "published") {
    const generateResult = await generateScheduledStepsForProduct(
      createdProduct.id,
      validation.data.routineId,
      validation.data.userId
    );
  }
});
```

**Data Corruption Scenario**:
1. Product is inserted successfully (using `tx`)
2. `generateScheduledStepsForProduct` creates 100 scheduled steps (using global `db` - NOT in tx)
3. Transaction rolls back due to error
4. Product insertion is rolled back ✅
5. **But 100 scheduled steps remain in database with orphaned routineProductId** ❌

---

**Function**: `updateRoutineProduct` (lines 310-419)

**Problem**:
```typescript
await db.transaction(async (tx) => {
  // ✅ Uses tx
  const [product] = await tx.select()...;

  // ❌ Uses global db - NOT in transaction!
  const routine = await routineRepo.findById(product.routineId);

  // ✅ Uses tx
  const [updatedProduct] = await tx.update(skincareRoutineProducts)...;

  // ❌ Uses global db - NOT in transaction!
  if (routine.status === "published") {
    await deleteScheduledStepsForProduct(...); // Uses global db
    await generateScheduledStepsForProduct(...); // Uses global db
  }
});
```

**Data Corruption Scenario**:
1. Product update succeeds (using `tx`)
2. Old scheduled steps are deleted (using global `db` - committed immediately)
3. New scheduled steps are created (using global `db` - committed immediately)
4. Transaction rolls back due to error
5. Product update is rolled back ✅
6. **But old steps are permanently deleted, new steps are permanently created** ❌
7. **Product has wrong data but steps match the rolled-back data** ❌

---

**Function**: `deleteRoutineProduct` (lines 425-488)

**Problem**:
```typescript
await db.transaction(async (tx) => {
  // ✅ Uses tx
  const [product] = await tx.select()...;

  // ❌ Uses global db - NOT in transaction!
  const routine = await routineRepo.findById(product.routineId);

  // ❌ Uses global db - NOT in transaction!
  if (routine.status === "published") {
    await deleteScheduledStepsForProduct(...);
  }

  // ✅ Uses tx
  const [deletedProduct] = await tx.delete(skincareRoutineProducts)...;
});
```

**Data Corruption Scenario**:
1. Scheduled steps are deleted (using global `db` - committed immediately)
2. Product deletion fails
3. Transaction rolls back
4. Product still exists ✅
5. **But all scheduled steps are permanently deleted** ❌
6. **Product exists but has zero scheduled steps** ❌

---

### 2. `src/app/(dashboard)/routine-management/template-actions/copy-template.ts`

**Function**: `copyTemplateToUser` (lines 79-168)

**Problem**:
```typescript
await db.transaction(async (tx) => {
  // ❌ Uses global db - NOT in transaction!
  const template = await templateRepo.findById(validation.data.templateId);

  // ❌ Uses global db - NOT in transaction!
  const existingRoutine = await routineRepo.findByUserId(validation.data.userId);

  // ❌ Uses global db - NOT in transaction!
  const templateProducts = await templateRepo.findProductsByTemplateId(...);

  // ❌ Uses global db - NOT in transaction!
  const newRoutine = await routineRepo.create({...});

  // ✅ Uses tx - in transaction
  const copiedProducts = await tx
    .insert(skincareRoutineProducts)
    .values(productValues)
    .returning();
});
```

**Data Corruption Scenario**:
1. Template is fetched (global `db`)
2. New routine is created (global `db` - **committed immediately**)
3. Products batch insert fails (using `tx`)
4. Transaction rolls back
5. **Routine exists in database with ZERO products** ❌
6. **User has empty routine that was supposed to be a template copy** ❌

---

## Root Cause Analysis

### Repository Pattern Using Global DB

All repos are created with factory functions that use the global `db`:

```typescript
// src/app/(dashboard)/subscribers/[id]/compliance-actions/routine-step-completions.repo.ts
export function makeRoutineStepCompletionsRepo() {
  return {
    async createMany(completions: NewRoutineStepCompletion[]) {
      const created = await db  // ❌ Global db hardcoded
        .insert(routineStepCompletions)
        .values(completions)
        .returning();

      return created as RoutineStepCompletion[];
    },
  };
}
```

**Problem**: There's no way to pass the `tx` object to these repo methods.

### Helper Functions Using Global DB

```typescript
// src/app/(dashboard)/subscribers/[id]/compliance-actions/actions.ts
export async function generateScheduledStepsForProduct(
  productId: string,
  routineId: string,
  userId: string,
  deps: GenerateStepsDeps = defaultGenerateStepsDeps
) {
  const { completionsRepo } = deps;

  // ...

  // ❌ Uses repo which uses global db
  await completionsRepo.createMany(completionsToCreate);
}
```

**Problem**: Even if we pass `tx` to this function, it calls repo methods that use global `db`.

---

## The Fix

### Option A: Refactor Repos to Accept Optional Transaction Parameter (BEST)

**Pros**:
- Preserves repository pattern
- Type-safe with TypeScript
- Explicit transaction participation
- Testable

**Cons**:
- Requires refactoring all repo files
- Changes repo interfaces
- Updates all repo method signatures

**Example**:
```typescript
export function makeRoutineStepCompletionsRepo() {
  return {
    async createMany(
      completions: NewRoutineStepCompletion[],
      dbOrTx?: typeof db // Accept either db or tx
    ) {
      const executor = dbOrTx ?? db; // Use tx if provided, otherwise db

      const created = await executor
        .insert(routineStepCompletions)
        .values(completions)
        .returning();

      return created as RoutineStepCompletion[];
    },
  };
}
```

Usage:
```typescript
await db.transaction(async (tx) => {
  // Pass tx to repo methods
  await repo.createMany(completions, tx); // ✅ Part of transaction
});
```

---

### Option B: Call Database Directly with `tx` (FASTER FIX)

**Pros**:
- No repo refactoring needed
- Direct and explicit
- Guaranteed to work

**Cons**:
- Bypasses repository pattern
- Duplicates database logic
- Less testable
- Violates separation of concerns

**Example**:
```typescript
await db.transaction(async (tx) => {
  // Direct database calls with tx
  const [createdProduct] = await tx
    .insert(skincareRoutineProducts)
    .values(newProduct)
    .returning();

  // Direct batch insert instead of repo
  if (routine.status === "published") {
    const completionsToCreate = [...]; // Generate schedule

    await tx // ✅ Uses tx directly
      .insert(routineStepCompletions)
      .values(completionsToCreate)
      .returning();
  }
});
```

---

### Option C: Hybrid Approach (PRAGMATIC)

Use `tx` for critical write operations, accept that read operations aren't transactional:

```typescript
await db.transaction(async (tx) => {
  // Read operations can use global db (non-critical)
  const routine = await routineRepo.findById(routineId); // ❌ Not in tx, but OK

  if (!routine) {
    throw new Error("Routine not found");
  }

  // ALL WRITE operations MUST use tx
  const [createdProduct] = await tx
    .insert(skincareRoutineProducts)
    .values(newProduct)
    .returning();

  // Critical: inline the batch insert logic
  if (routine.status === "published") {
    const completionsToCreate = [...]; // Generate schedule

    await tx // ✅ Write uses tx
      .insert(routineStepCompletions)
      .values(completionsToCreate);
  }
});
```

**Pros**:
- Faster to implement than Option A
- Maintains data integrity for writes
- Reads are non-critical (dirty reads acceptable)

**Cons**:
- Inconsistent pattern (some tx, some db)
- Possible phantom reads (but low risk)

---

## Recommended Fix Order

1. **IMMEDIATE**: Fix `copyTemplateToUser` (highest corruption risk - creates empty routines)
2. **HIGH**: Fix `deleteRoutineProduct` (deletes steps permanently even if delete fails)
3. **HIGH**: Fix `updateRoutineProduct` (deletes/creates steps even if update fails)
4. **MEDIUM**: Fix `createRoutineProduct` (orphaned steps if creation fails)

---

## Testing Strategy

After fixing each function:

### Unit Test: Verify Transaction Rollback
```typescript
it("should rollback all operations on error", async () => {
  // Force an error midway through transaction
  await expect(
    createRoutineProduct(userId, {...}, {
      ...deps,
      generateScheduledStepsForProduct: async () => {
        throw new Error("Simulated failure");
      },
    })
  ).rejects.toThrow();

  // Verify nothing was committed
  const products = await db.select().from(skincareRoutineProducts);
  expect(products).toHaveLength(0); // ✅ Rolled back

  const steps = await db.select().from(routineStepCompletions);
  expect(steps).toHaveLength(0); // ✅ Rolled back (THIS CURRENTLY FAILS!)
});
```

### Integration Test: Verify All-or-Nothing
```typescript
it("should create product AND steps atomically", async () => {
  const result = await createRoutineProduct(userId, {...});

  expect(result.success).toBe(true);

  // Both should exist
  const products = await db.select().from(skincareRoutineProducts);
  expect(products).toHaveLength(1);

  const steps = await db.select().from(routineStepCompletions);
  expect(steps.length).toBeGreaterThan(0); // Scheduled steps exist
});
```

---

## References

- **Drizzle ORM Transactions**: https://orm.drizzle.team/docs/transactions
- **Stack Overflow**: "Does drizzle ORM auto rollbacks when there is an exception"
- **Search Results**: Confirmed that `tx` object must be used for ALL queries in transaction
- **Web Search Date**: 2025-01-20

---

**End of Critical Bug Report**
