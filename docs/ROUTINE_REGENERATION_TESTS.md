# Routine Task Regeneration - Test Specification

**Purpose:** Complete TDD test specification for implementing the 60-day rolling window task regeneration system.

**Total Tests:** 69 tests

**Related Docs:**
- Design: `docs/ROUTINE_COMPLETION_REGENERATION.md`
- Testing Guide: `docs/TESTING.md`
- Code Explanation Standard: `docs/CODE_EXPLANATION_STANDARD.md`

---

## Test Organization

```
src/app/(dashboard)/subscribers/[id]/routine-info-actions/
├── actions.ts                          # Implementation
├── actions.unit.test.ts                # publishRoutine, updateRoutine tests
└── routine.repo.ts                     # Repository

src/app/(dashboard)/subscribers/[id]/compliance-actions/
├── routine-products.repo.ts            # Product repository
└── routine-products-update.unit.test.ts # updateRoutineProduct tests

src/lib/
├── compliance-utils.ts                 # Helper functions
└── compliance-utils.unit.test.ts       # Helper function tests

src/test/
└── integration/
    └── routine-regeneration.integration.test.ts # Full workflow tests
```

---

## 1. publishRoutine() - 60-day window (18 tests)

### Happy path (3 tests)

```typescript
it("generates tasks from start date to 60 days ahead when routine starts today");
it("generates tasks from today to 60 days ahead when start date is in the past");
it("generates tasks from future start date to 60 days ahead when start date is in future");
```

### End date boundary (3 tests)

```typescript
it("caps tasks at end date when end date is less than 60 days from start");
it("generates full 60 days when end date is more than 60 days from start");
it("generates tasks correctly when no end date is provided");
```

### Edge cases (3 tests)

```typescript
it("handles routine with single product");
it("handles routine with multiple products at different times of day");
it("handles products with different frequencies (daily, 2x/week, specific days)");
```

### Timezone handling (2 tests)

```typescript
it("calculates deadlines in user's timezone (Nairobi UTC+3)");
it("calculates deadlines in user's timezone (Los Angeles UTC-8)");
```

### Validation (4 tests)

```typescript
it("returns error when routine not found");
it("returns error when routine already published");
it("returns error when routine has no products");
it("returns error when user profile not found");
```

### Error handling (3 tests)

```typescript
it("handles database errors during transaction");
it("rolls back transaction when step creation fails");
```

**Subtotal: 18 tests**

---

## 2. updateRoutine() - Start date changes (12 tests)

### Start date moved FORWARD (6 tests)

```typescript
it("deletes uncompleted tasks before new start date");
it("keeps completed tasks before new start date (on-time)");
it("keeps completed tasks before new start date (late)");
it("keeps pending tasks after new start date");
it("generates tasks from new start date to 60 days ahead");
it("caps at end date when end date < new start + 60 days");
```

### Edge cases for forward (3 tests)

```typescript
it("handles new start date in the future");
it("handles new start date that moves to today");
it("handles all tasks being deleted (new start beyond all existing)");
```

### Start date moved BACKWARD (3 tests)

```typescript
it("does not create tasks in the past");
it("keeps existing future tasks unchanged");
it("does not regenerate anything when backdating");
```

**Subtotal: 12 tests**

---

## 3. updateRoutine() - End date changes (10 tests)

### End date moved EARLIER (5 tests)

```typescript
it("deletes uncompleted tasks beyond new end date");
it("keeps completed tasks beyond new end date");
it("keeps uncompleted tasks before new end date");
it("handles end date moved to before today (deletes all future tasks)");
it("handles end date moved to today exactly");
```

### End date moved LATER (4 tests)

```typescript
it("generates tasks for gap between old end and new end (within 60-day cap)");
it("respects 60-day cap when extending end date far into future");
it("handles extending indefinite routine (no end date → has end date)");
it("generates no new tasks when old end date was at 60-day cap");
```

### End date set to null - indefinite (1 test)

```typescript
it("extends tasks to 60-day cap from today");
```

**Subtotal: 10 tests**

---

## 4. updateRoutineProduct() - Product changes (15 tests)

### Delete and regenerate (4 tests)

```typescript
it("deletes uncompleted future tasks for the product");
it("keeps completed tasks for the product unchanged");
it("regenerates tasks with new frequency from today to 60-day cap");
it("regenerates tasks with new time of day from today to 60-day cap");
```

### Multiple changes (2 tests)

```typescript
it("handles frequency AND timeOfDay change together");
it("handles days array change (Mon/Wed → Tue/Thu)");
```

### Other products unaffected (1 test)

```typescript
it("does not regenerate tasks for other products in same routine");
```

### Draft routine - no regeneration (2 tests)

```typescript
it("does not regenerate tasks when routine is draft");
it("updates product details without task regeneration for draft");
```

### Edge cases (2 tests)

```typescript
it("handles product with no existing tasks (new product)");
it("respects routine end date when regenerating");
```

### Validation (2 tests)

```typescript
it("returns error when product not found");
it("returns error when routine not found");
```

### Error handling (2 tests)

```typescript
it("handles database errors during transaction");
it("rolls back product update when task regeneration fails");
```

**Subtotal: 15 tests**

---

## 5. shouldGenerateForDate() - Helper function (7 tests)

### Daily frequency (1 test)

```typescript
it("returns true for all days when frequency is daily");
```

### Specific days (4 tests)

```typescript
it("returns true when date matches one of the scheduled days");
it("returns false when date does not match scheduled days");
it("handles Monday correctly");
it("handles Sunday correctly");
```

### Edge cases (2 tests)

```typescript
it("returns false when frequency is not daily and no days specified");
it("handles empty days array");
```

**Subtotal: 7 tests**

---

## 6. Integration tests - Full workflows (7 tests)

### Complex workflows (3 tests)

```typescript
it("publishes → updates start date forward → updates end date → updates product frequency");
it("publishes → updates multiple products → verifies tasks regenerated correctly");
it("publishes → user completes some tasks → updates start date → completed tasks remain");
```

### Timezone edge cases (2 tests)

```typescript
it("handles user near midnight in their timezone");
it("handles DST transitions correctly");
```

### Data integrity (2 tests)

```typescript
it("maintains referential integrity when deleting and recreating tasks");
it("does not create duplicate tasks when called multiple times");
```

**Subtotal: 7 tests**

---

## Test Summary

| Category | Test Count |
|----------|------------|
| publishRoutine() | 18 |
| updateRoutine() - start date | 12 |
| updateRoutine() - end date | 10 |
| updateRoutineProduct() | 15 |
| shouldGenerateForDate() | 7 |
| Integration tests | 7 |
| **TOTAL** | **69** |

---

## Testing Patterns to Follow

Based on `docs/TESTING.md`:

### 1. Result Type Pattern
```typescript
type SuccessResult<T> = { success: true; data: T };
type ErrorResult = { success: false; error: string };
type Result<T> = SuccessResult<T> | ErrorResult;
```

### 2. Dependency Injection
```typescript
export type PublishRoutineDeps = {
  routineRepo: ReturnType<typeof makeRoutineRepo>;
  productRepo: ReturnType<typeof makeRoutineProductsRepo>;
  now: () => Date;
};

export async function publishRoutine(
  routineId: string,
  deps: PublishRoutineDeps = defaultPublishDeps
): Promise<Result<Routine>> {
  // ...
}
```

### 3. Fixed Test Data
```typescript
describe("publishRoutine - Unit Tests", () => {
  // Test UUIDs - increment last segment
  const user1Id = "550e8400-e29b-41d4-a716-446655440000";
  const routineId = "750e8400-e29b-41d4-a716-446655440001";
  const productId = "850e8400-e29b-41d4-a716-446655440001";

  // Fixed timestamp
  const fixedNow = new Date("2025-10-31T10:00:00Z");
});
```

### 4. Manual Store Setup for Updates
```typescript
it("updates routine start date", async () => {
  // Manually set up existing routine
  repo._store.set(routineId, {
    id: routineId,
    userProfileId: user1Id,
    startDate: new Date("2025-10-31"),
    endDate: null,
    status: "published",
    createdAt: new Date("2025-10-01"),
    updatedAt: new Date("2025-10-01"),
  });

  const result = await updateRoutine(routineId, {
    startDate: new Date("2025-11-10")
  }, deps);

  // Assert...
});
```

### 5. Error Handling Pattern
```typescript
it("handles database errors during transaction", async () => {
  const repo = makeRoutineRepoFake();

  // Mock method to throw
  repo.update = async () => {
    throw new Error("Database connection failed");
  };

  const deps = { repo, now: () => fixedNow };
  const result = await updateRoutine(routineId, { name: "Updated" }, deps);

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toBe("Failed to update routine");
  }
});
```

---

## Implementation Checklist

- [ ] Set up test files (4 files)
- [ ] Write publishRoutine tests (18 tests)
- [ ] Write updateRoutine start date tests (12 tests)
- [ ] Write updateRoutine end date tests (10 tests)
- [ ] Write updateRoutineProduct tests (15 tests)
- [ ] Write shouldGenerateForDate tests (7 tests)
- [ ] Write integration tests (7 tests)
- [ ] All 69 tests passing
- [ ] Update `docs/ROUTINE_COMPLETION_REGENERATION.md` implementation status

---

**Last Updated:** 2025-10-31
