# Import Cleanup - Remove Indirection Layer

**Status**: TODO
**Created**: 2025-01-11
**Issue**: Files are importing types from `@/lib/db` which re-exports from `schema.ts`. This is unnecessary indirection.

---

## Problem

Currently `lib/db/index.ts` re-exports everything from schema:
```typescript
export * from "./schema";
```

This creates an unnecessary layer of indirection. Types should be imported directly from where they're defined.

---

## Solution

### Import Pattern Changes

**Before (WRONG - unnecessary indirection)**:
```typescript
import { type UserProfile, type Admin, db } from "@/lib/db";
```

**After (CORRECT - direct import from source)**:
```typescript
import { type UserProfile, type Admin } from "@/lib/db/schema";
import { db } from "@/lib/db";
```

**Exception**: `DrizzleDB` type stays in `@/lib/db` since that's where the `db` instance is defined:
```typescript
import { type DrizzleDB } from "@/lib/db";  // ✅ Correct
```

---

## Files to Update (32 total)

### Auth & Admin (3 files)
- [ ] `src/actions/auth.ts`
- [ ] `src/app/api/admins/admins.repo.ts`
- [ ] `src/app/api/admins/route.unit.test.ts`

### Routine Management - Templates (3 files)
- [ ] `src/app/(dashboard)/routine-management/template-actions/copy-template.ts`
- [ ] `src/app/(dashboard)/routine-management/template-actions/template.repo.fake.ts`
- [ ] `src/app/(dashboard)/routine-management/template-actions/template.repo.ts`

### Subscriber Actions - Coach Notes (1 file)
- [ ] `src/app/(dashboard)/subscribers/[id]/coach-notes-actions/coach-notes.repo.ts`

### Subscriber Actions - Compliance (4 files)
- [ ] `src/app/(dashboard)/subscribers/[id]/compliance-actions/routine-products.repo.ts`
- [ ] `src/app/(dashboard)/subscribers/[id]/compliance-actions/routine-step-completions.repo.ts`
- [ ] `src/app/(dashboard)/subscribers/[id]/compliance-actions/routine.repo.ts`
- [ ] `src/app/(dashboard)/subscribers/[id]/compliance-actions/user-profile.repo.ts`

### Subscriber Actions - Goals (2 files)
- [ ] `src/app/(dashboard)/subscribers/[id]/goal-actions/goals-template.repo.ts`
- [ ] `src/app/(dashboard)/subscribers/[id]/goal-actions/goals.repo.ts`

### Subscriber Actions - Profile (1 file)
- [ ] `src/app/(dashboard)/subscribers/[id]/profile-header-actions/user-profile.repo.ts`

### Subscriber Actions - Progress Photos (1 file)
- [ ] `src/app/(dashboard)/subscribers/[id]/progress-photos-actions/progress-photos.repo.ts`

### Subscriber Actions - Routines (2 files)
- [ ] `src/app/(dashboard)/subscribers/[id]/routine-actions/actions.ts`
- [ ] `src/app/(dashboard)/subscribers/[id]/routine-actions/routine.repo.ts`

### Subscriber Actions - Routine Info (5 files)
- [ ] `src/app/(dashboard)/subscribers/[id]/routine-info-actions/publish-routine.ts`
- [ ] `src/app/(dashboard)/subscribers/[id]/routine-info-actions/routine-crud.ts`
- [ ] `src/app/(dashboard)/subscribers/[id]/routine-info-actions/routine.repo.ts`
- [ ] `src/app/(dashboard)/subscribers/[id]/routine-info-actions/update-routine-product.ts`
- [ ] `src/app/(dashboard)/subscribers/[id]/routine-info-actions/update-routine.ts`

### Subscriber Actions - Other (2 files)
- [ ] `src/app/(dashboard)/subscribers/[id]/subscriber-data-actions/actions.ts`
- [ ] `src/app/(dashboard)/subscribers/[id]/types.ts`

### Subscribers (2 files)
- [ ] `src/app/(dashboard)/subscribers/actions.ts`
- [ ] `src/app/(dashboard)/subscribers/userProfiles.repo.ts`

### API - Consumer App (3 files)
- [ ] `src/app/api/consumer-app/dashboard/dashboard.repo.ts`
- [ ] `src/app/api/consumer-app/goals-template/goals-template.repo.ts`
- [ ] `src/app/api/consumer-app/profile/profile.repo.ts`

### Scripts & Tests (3 files)
- [ ] `src/scripts/seed-profiles.ts`
- [ ] `src/test/db-helpers.ts`
- [ ] `src/test/factories.ts`

---

## Changes to lib/db/index.ts

Remove the re-export line:
```typescript
// ❌ DELETE THIS:
export * from "./schema";
```

Final `lib/db/index.ts` should only export:
```typescript
export const client = ...;
export const db = ...;
export type DrizzleDB = typeof db;
```

---

## Verification Steps

1. **After updating all files**, verify no files import types from `@/lib/db`:
   ```bash
   grep -r 'from "@/lib/db"' src --include="*.ts" --include="*.tsx" | grep "type"
   ```

   Should only show `DrizzleDB` imports, no other types.

2. **Run build**:
   ```bash
   npm run build
   ```

3. **Run tests**:
   ```bash
   npm run test:run
   ```

---

## Example Updates

### Example 1: Repository File
```typescript
// Before
import { db, type UserProfile, type NewUserProfile } from "@/lib/db";

// After
import { db, type DrizzleDB } from "@/lib/db";
import { type UserProfile, type NewUserProfile } from "@/lib/db/schema";
```

### Example 2: Test File
```typescript
// Before
import {
  type UserProfile,
  type Admin,
  type RoutineTemplate,
} from "@/lib/db";

// After
import {
  type UserProfile,
  type Admin,
  type RoutineTemplate,
} from "@/lib/db/schema";
```

### Example 3: Mixed Imports
```typescript
// Before
import { db, type DrizzleDB, type SkincareRoutine } from "@/lib/db";

// After
import { db, type DrizzleDB } from "@/lib/db";
import { type SkincareRoutine } from "@/lib/db/schema";
```

---

## Benefits

1. **Clearer dependency graph** - imports show true source of types
2. **No indirection** - schema.ts is the single source of truth
3. **Easier maintenance** - clear where each type is defined
4. **Better IDE support** - "Go to definition" goes to actual source

---

## Notes

- This cleanup is **non-functional** - it improves code organization without changing behavior
- All 636 tests should still pass after this change
- This can be done incrementally (file by file) or all at once
