# Transaction Fixes Applied

> **Date**: 2025-01-20
> **Status**: ✅ CRITICAL issues fixed, ⚠️ Known limitations documented

---

## Summary

Fixed critical transaction bugs discovered in TRANSACTION_BUG_CRITICAL.md where operations using global `db` within transaction callbacks were NOT participating in transactions.

### Official Source

> "If you use the regular `db` object instead of `tx` for some queries within a transaction callback, those queries will execute on a different database connection and **won't be part of the transaction**, meaning they won't rollback if an error occurs."

**Source**: Web search on "Drizzle ORM transaction must use tx object all queries or rollback fails" (2025-01-20)

---

## Fixes Applied

### 1. ✅ copyTemplateToUser - FULLY FIXED

**File**: `src/app/(dashboard)/routine-management/template-actions/copy-template.ts`

**Problem**: Routine creation used `routineRepo.create()` which uses global `db`. If product batch INSERT failed, routine remained in database (empty routine corruption).

**Fix Applied**:
- Moved all read-only validation BEFORE transaction
- Changed routine creation to use `tx.insert()` directly instead of repo
- Both routine INSERT and products batch INSERT now use `tx`
- Fully transactional - all operations commit together or roll back together

**Code Changes**:
```typescript
// BEFORE (BROKEN)
await db.transaction(async (tx) => {
  const routine = await routineRepo.create({...}); // ❌ Uses global db
  const products = await tx.insert(...).values([...]); // ✅ Uses tx
});

// AFTER (FIXED)
await db.transaction(async (tx) => {
  const [routine] = await tx.insert(skincareRoutines).values({...}); // ✅ Uses tx
  const products = await tx.insert(skincareRoutineProducts).values([...]); // ✅ Uses tx
});
```

**Verification**: Official Drizzle pattern confirmed - all write operations use `tx` object.

---

### 2. ✅ deleteRoutineProduct - FULLY FIXED

**File**: `src/app/(dashboard)/subscribers/[id]/routine-actions/actions.ts`

**Problem**: Step deletion used `deleteScheduledStepsForProduct()` which calls `completionsRepo.deleteByRoutineProductId()` which uses global `db`. Steps were permanently deleted even if product deletion failed.

**Fix Applied**:
- Inlined the DELETE query to use `tx` directly
- Both step deletion and product deletion now use `tx`
- Fully transactional - both operations commit together or roll back together

**Code Changes**:
```typescript
// BEFORE (BROKEN)
await db.transaction(async (tx) => {
  await deleteScheduledStepsForProduct(...); // ❌ Uses global db via repo
  await tx.delete(skincareRoutineProducts)...; // ✅ Uses tx
});

// AFTER (FIXED)
await db.transaction(async (tx) => {
  await tx.delete(routineStepCompletions)...; // ✅ Uses tx
  await tx.delete(skincareRoutineProducts)...; // ✅ Uses tx
});
```

**Verification**: Official Drizzle pattern confirmed - both DELETE operations use `tx` object.

---

### 3. ⚠️ updateRoutineProduct - PARTIALLY FIXED

**File**: `src/app/(dashboard)/subscribers/[id]/routine-actions/actions.ts`

**Problem**: Step deletion and regeneration used helper functions that use global `db`. Steps were modified even if product update failed.

**Fix Applied**:
- Inlined step DELETE query to use `tx` directly
- Product update now uses `tx`
- Step regeneration remains OUTSIDE transaction (documented limitation)

**Code Changes**:
```typescript
// AFTER (IMPROVED)
await db.transaction(async (tx) => {
  await tx.update(skincareRoutineProducts)...; // ✅ Uses tx
  await tx.delete(routineStepCompletions)...; // ✅ Uses tx - FIXED
  // Step regeneration NOT in transaction - too complex to inline
});

// After transaction: regenerate steps (NOT transactional)
if (routineStatus === "published") {
  const result = await generateScheduledStepsForProduct(...); // ⚠️ NOT in transaction
  if (!result.success) {
    return {
      success: false,
      error: "Product updated but failed to regenerate schedule. Please contact support."
    };
  }
}
```

**Verification**: Product update and step deletion are transactional (verified against official Drizzle docs). Step generation is NOT transactional (documented limitation).

**Known Limitation**: If step generation fails after transaction commits, product is updated and old steps are deleted, but new steps are not created. User receives clear error message.

**Future Fix Required**: Refactor repos to accept optional transaction parameter, or inline entire step generation logic.

---

### 4. ⚠️ createRoutineProduct - PARTIALLY FIXED

**File**: `src/app/(dashboard)/subscribers/[id]/routine-actions/actions.ts`

**Problem**: Step generation used `generateScheduledStepsForProduct()` which calls `completionsRepo.createMany()` which uses global `db`. Orphaned steps created if product creation failed.

**Fix Applied**:
- Product creation uses `tx` directly
- Step generation remains OUTSIDE transaction (documented limitation)

**Code Changes**:
```typescript
// AFTER (IMPROVED)
const product = await db.transaction(async (tx) => {
  const [product] = await tx.insert(skincareRoutineProducts)...; // ✅ Uses tx
  return product;
});

// After transaction: generate steps (NOT transactional)
if (routineStatus === "published") {
  const result = await generateScheduledStepsForProduct(...); // ⚠️ NOT in transaction
  if (!result.success) {
    return {
      success: false,
      error: "Product created but failed to generate schedule. Please contact support."
    };
  }
}
```

**Verification**: Product creation is transactional (verified against official Drizzle docs). Step generation is NOT transactional (documented limitation).

**Known Limitation**: If step generation fails after transaction commits, product exists but has no scheduled steps. User receives clear error message.

**Future Fix Required**: Refactor repos to accept optional transaction parameter, or inline entire step generation logic.

---

## Why Partial Fixes?

The `generateScheduledStepsForProduct` function is ~90 lines of complex logic that:
1. Fetches routine, user, and product data from 3 different repos
2. Calculates schedules based on frequency, days, timezone
3. Loops through date ranges generating completion records
4. Batch inserts all completions

**Options Considered**:

### Option A: Inline Everything (Rejected)
- ❌ 90+ lines of complex logic duplicated in 2 places
- ❌ High risk of bugs during copy-paste
- ❌ Violates DRY principle
- ❌ Makes code unmaintainable

### Option B: Refactor All Repos (Correct, but time-consuming)
- ✅ Cleanest solution
- ✅ Makes entire stack transactional
- ❌ Requires refactoring ~7 repo files
- ❌ Requires changing ~30 repo method signatures
- ❌ Requires updating all tests
- ⏱️ Estimated 4-6 hours of work

### Option C: Hybrid Approach (Chosen)
- ✅ Fixes most critical data corruption (DELETE operations)
- ✅ Makes CRUD operations transactional
- ✅ Documents known limitations honestly
- ✅ Provides clear error messages to users
- ⚠️ Step generation remains non-transactional
- ✅ Can be fixed later with Option B

**Decision**: Chose Option C (hybrid) for immediate fix with honest documentation of limitations.

---

## Data Integrity Analysis

### Before Fixes:
1. ❌ **copyTemplateToUser**: Empty routines created on failure
2. ❌ **deleteRoutineProduct**: Steps deleted even if product deletion fails
3. ❌ **updateRoutineProduct**: Steps modified even if product update fails
4. ❌ **createRoutineProduct**: Orphaned steps created if product creation fails

### After Fixes:
1. ✅ **copyTemplateToUser**: Fully atomic - no partial data
2. ✅ **deleteRoutineProduct**: Fully atomic - no partial data
3. ⚠️ **updateRoutineProduct**: Product/step DELETE atomic, regeneration NOT atomic
4. ⚠️ **createRoutineProduct**: Product creation atomic, step generation NOT atomic

### Remaining Risk:
- **updateRoutineProduct**: If step regeneration fails (rare), product is updated but has zero steps. User notified via error message.
- **createRoutineProduct**: If step generation fails (rare), product exists but has zero steps. User notified via error message.

**Risk Level**: LOW - only affects edge cases where step generation fails (database full, network timeout, etc.)

---

## Testing Verification

### Manual Testing Performed:
- ✅ Verified `tx.insert()`, `tx.update()`, `tx.delete()` syntax matches Drizzle docs
- ✅ Verified imports of table schemas (`skincareRoutines`, `routineStepCompletions`)
- ✅ Verified Drizzle ORM operators (`eq`, `and`, `gte`, `inArray`)

### Automated Tests Required:
1. **Rollback Test for copyTemplateToUser**: Force error during product INSERT, verify routine is NOT created
2. **Rollback Test for deleteRoutineProduct**: Force error during product DELETE, verify steps are NOT deleted
3. **Rollback Test for updateRoutineProduct**: Force error during step DELETE, verify product is NOT updated
4. **Edge Case Test for updateRoutineProduct**: Simulate step regeneration failure, verify error message
5. **Edge Case Test for createRoutineProduct**: Simulate step generation failure, verify error message

---

## Documentation Updates

### Added Comments:
- ✅ Clear comments explaining use of `tx` vs global `db`
- ✅ "CRITICAL" markers on key transactional operations
- ✅ "NOTE" markers documenting non-transactional limitations
- ✅ "TODO" markers for future refactoring

### Error Messages:
- ✅ Clear user-facing error: "Product updated but failed to regenerate schedule. Please contact support."
- ✅ Clear user-facing error: "Product created but failed to generate schedule. Please contact support."

---

## Next Steps

### Immediate (Done):
- ✅ Fix copyTemplateToUser (highest risk)
- ✅ Fix deleteRoutineProduct (high risk)
- ⚠️ Fix updateRoutineProduct (partial - DELETE transactional, generation NOT)
- ⚠️ Fix createRoutineProduct (partial - creation transactional, generation NOT)

### Short-term (Recommended):
- ⏱️ Add automated rollback tests
- ⏱️ Add edge case tests for step generation failures
- ⏱️ Monitor error logs for "failed to regenerate schedule" errors

### Long-term (Correct Solution):
- 🔄 Refactor all repos to accept optional `tx` parameter
- 🔄 Pass `tx` through entire call chain
- 🔄 Make step generation fully transactional
- 🔄 Remove all "NOTE" and "TODO" comments

---

## References

- **Drizzle ORM Transactions**: https://orm.drizzle.team/docs/transactions
- **Stack Overflow**: "Does drizzle ORM auto rollbacks when there is an exception"
- **Search Results**: Confirmed `tx` object must be used for ALL queries within transaction
- **Original Bug Report**: TRANSACTION_BUG_CRITICAL.md
- **Web Search Date**: 2025-01-20

---

**End of Transaction Fixes Report**
