# Type Coupling Refactor Plan

## Problem Statement

Adding a single optional field (like `nickname`) to the database schema breaks 12+ files across tests, components, and APIs. This is caused by manual type duplication instead of deriving types from the schema.

**Current Impact**: ~380 coupling points across the codebase

## Goal

Refactor to use `InferSelectModel` + `Pick/Omit` pattern so that:
- Adding schema fields only requires updating 1-2 files
- Tests automatically include new fields via factories
- Components get exactly the types they need

## Migration Strategy: Incremental & Safe

### Principles
1. ✅ Fix one file at a time
2. ✅ Run tests after each change
3. ✅ No big-bang refactors
4. ✅ Keep production stable
5. ✅ Document as we go

---

## Phase 1: Foundation (COMPLETE ✅)

**Status**: DONE
- [x] Create `src/lib/db/types.ts` with base types and view models
- [x] Create `src/test/factories.ts` with `makeUserProfile()`
- [x] Document pattern in `docs/TESTING.md`
- [x] Update one example (dashboard.repo.ts)

---

## Phase 2: Test Files (HIGH PRIORITY - 3 days)

**Goal**: Remove 200+ coupling points from test files

### Day 1: Subscriber Table Tests

**Files**: 1 file, 69 coupling points

#### Task 2.1: Update subscribers-table.test.tsx
- **File**: `src/app/(dashboard)/subscribers/_components/subscribers-table.test.tsx`
- **Lines**: 26-101
- **Action**: Replace manual mock objects with factory
- **Estimated Time**: 1 hour

**Before**:
```typescript
const mockProfiles = [
  {
    id: "profile-1",
    firstName: "John",
    lastName: "Doe",
    // ... 20 more fields manually typed
  },
];
```

**After**:
```typescript
import { makeUserProfile } from "@/test/factories";

const mockProfiles = [
  makeUserProfile({
    id: "profile-1",
    firstName: "John",
    lastName: "Doe",
  }),
];
```

**Validation**: `npm run test subscribers-table.test.tsx`

---

### Day 2: API Route Tests (Part 1)

**Files**: 2 files, 88 coupling points

#### Task 2.2: Update user-profiles/[id]/route.unit.test.ts
- **File**: `src/app/api/user-profiles/[id]/route.unit.test.ts`
- **Lines**: 64-87, 221-250
- **Action**: Use factory for mock user data
- **Estimated Time**: 45 minutes

#### Task 2.3: Update user-profiles/by-email/route.unit.test.ts
- **File**: `src/app/api/user-profiles/by-email/route.unit.test.ts`
- **Lines**: 60-83, 116-139
- **Action**: Use factory for mock user data
- **Estimated Time**: 45 minutes

**Validation**: `npm run test user-profiles`

---

### Day 3: API Route Tests (Part 2) + Client Page Tests

**Files**: 2 files, 43 coupling points

#### Task 2.4: Update user-profiles/check/route.unit.test.ts
- **File**: `src/app/api/user-profiles/check/route.unit.test.ts`
- **Lines**: 22-45
- **Action**: Use factory
- **Estimated Time**: 30 minutes

#### Task 2.5: Create Client DTO factory
- **File**: `src/test/factories.ts`
- **Action**: Add `makeClient()` factory for component tests
- **Estimated Time**: 1 hour

**New Factory**:
```typescript
export function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: crypto.randomUUID(),
    name: "Test User",
    age: 30,
    email: "test@example.com",
    mobile: "555-1234",
    occupation: "Engineer",
    bio: "Test bio",
    skinType: "normal",
    concerns: [],
    planWeeks: 12,
    currentWeek: 1,
    startDate: new Date().toISOString().split('T')[0],
    hasRoutine: false,
    ...overrides,
  };
}
```

#### Task 2.6: Update client-page-wrapper.test.tsx
- **File**: `src/app/(dashboard)/subscribers/[id]/_components/client-page-wrapper.test.tsx`
- **Lines**: 70-84 and other mock objects
- **Action**: Use factories for all mock data
- **Estimated Time**: 1.5 hours

**Validation**: `npm run test client-page-wrapper`

---

**Phase 2 Checkpoint**: Run full test suite
```bash
npm run test:run
```

---

## Phase 3: Repository Layer (HIGH PRIORITY - 2 days)

**Goal**: Remove 50+ coupling points from repos

### Day 4: Goals Repository

#### Task 3.1: Refactor goals.repo.ts types
- **File**: `src/app/(dashboard)/subscribers/[id]/goal-actions/goals.repo.ts`
- **Lines**: 7-18
- **Action**: Replace manual type with Pick from schema
- **Estimated Time**: 1 hour

**Before**:
```typescript
export type Goal = {
  id: string;
  templateId: string;
  description: string;
  // ... 6 more fields manually typed
};
```

**After**:
```typescript
import { type SkincareGoalRow } from "@/lib/db/types";

export type Goal = Pick<
  SkincareGoalRow,
  | "id"
  | "templateId"
  | "description"
  | "isPrimaryGoal"
  | "complete"
  | "completedAt"
  | "order"
  | "createdAt"
  | "updatedAt"
>;
```

#### Task 3.2: Create Goal factory
- **File**: `src/test/factories.ts`
- **Action**: Add `makeGoal()` factory
- **Estimated Time**: 45 minutes

#### Task 3.3: Update goal-related tests
- **Files**: Any test importing Goal type
- **Action**: Use new factory
- **Estimated Time**: 1 hour

**Validation**: `npm run test goal`

---

### Day 5: Routine Repository

#### Task 3.4: Refactor routine.repo.ts types
- **File**: `src/app/(dashboard)/subscribers/[id]/routine-actions/routine.repo.ts`
- **Lines**: 7-22
- **Action**: Use Pick from SkincareRoutineProductRow
- **Estimated Time**: 1 hour

#### Task 3.5: Create RoutineProduct factory
- **File**: `src/test/factories.ts`
- **Action**: Add `makeRoutineProduct()` factory
- **Estimated Time**: 45 minutes

#### Task 3.6: Update routine-related tests
- **Files**: Any test importing RoutineProduct type
- **Action**: Use new factory
- **Estimated Time**: 1 hour

**Validation**: `npm run test routine`

---

#### Task 3.7: Refactor dashboard.repo.ts DTOs
- **File**: `src/app/api/consumer-app/dashboard/dashboard.repo.ts`
- **Lines**: 25-43
- **Action**: Derive Goal and RoutineStep from schema types
- **Estimated Time**: 1.5 hours

**Before**:
```typescript
export type Goal = {
  id: string;
  description: string;
  complete: boolean;
  completedAt: Date | null;
  order: number;
};
```

**After**:
```typescript
import { type SkincareGoalRow } from "@/lib/db/types";

export type Goal = Pick<
  SkincareGoalRow,
  "id" | "description" | "complete" | "completedAt" | "order"
>;
```

**Validation**: `npm run test dashboard`

**Phase 3 Checkpoint**: Run full test suite
```bash
npm run test:run
```

---

## Phase 4: Component Types (MEDIUM PRIORITY - 3 days)

**Goal**: Remove 100+ coupling points from components

### Day 6: Create DTO Layer

#### Task 4.1: Add DTO types to types.ts
- **File**: `src/lib/db/types.ts`
- **Action**: Add DTOs derived from schema
- **Estimated Time**: 2 hours

**Add**:
```typescript
// DTOs for client components
export type ClientDTO = {
  id: string;
  name: string; // Computed from firstName + lastName
  age: number; // Computed from dateOfBirth
  email: string;
  mobile: string; // phoneNumber
  occupation: string | null;
  bio: string | null;
  skinType: string; // Array joined
  concerns: string[];
  planWeeks: number; // From goals template
  currentWeek: number; // Computed
  startDate: string; // ISO string
  hasRoutine: boolean;
};

export type GoalDTO = Pick<
  SkincareGoalRow,
  "id" | "templateId" | "description" | "isPrimaryGoal" | "complete" | "completedAt" | "order"
>;

export type PhotoDTO = Pick<
  ProgressPhotoRow,
  "id" | "userProfileId" | "url" | "weekNumber" | "uploadedAt"
>;

// ... other DTOs
```

#### Task 4.2: Create transformation functions
- **File**: `src/lib/db/transformers.ts` (new file)
- **Action**: Create functions to transform schema types to DTOs
- **Estimated Time**: 2 hours

**Example**:
```typescript
import { type UserProfileRow } from "./types";
import { type ClientDTO } from "./types";

export function userProfileToClient(
  profile: UserProfileRow,
  additionalData: {
    planWeeks: number;
    currentWeek: number;
    hasRoutine: boolean;
  }
): ClientDTO {
  return {
    id: profile.id,
    name: `${profile.firstName} ${profile.lastName}`,
    age: calculateAge(profile.dateOfBirth),
    email: profile.email,
    mobile: profile.phoneNumber,
    occupation: profile.occupation,
    bio: profile.bio,
    skinType: profile.skinType?.join(", ") ?? "Unknown",
    concerns: profile.concerns ?? [],
    ...additionalData,
    startDate: profile.createdAt.toISOString().split('T')[0],
  };
}

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
```

**Validation**: TypeScript compilation

---

### Day 7: Refactor Component Types File

#### Task 4.3: Refactor types.ts (subscribers/[id])
- **File**: `src/app/(dashboard)/subscribers/[id]/types.ts`
- **Action**: Replace manual interfaces with imports from lib/db/types.ts
- **Estimated Time**: 2 hours

**Before**:
```typescript
export interface Client {
  id: string;
  name: string;
  // ... 12 more fields
}

export interface Goal { /* ... */ }
export interface Photo { /* ... */ }
// ... etc
```

**After**:
```typescript
export type { ClientDTO as Client } from "@/lib/db/types";
export type { GoalDTO as Goal } from "@/lib/db/types";
export type { PhotoDTO as Photo } from "@/lib/db/types";
// ... etc
```

#### Task 4.4: Update server actions to use transformers
- **Files**: `src/app/(dashboard)/subscribers/[id]/**/actions.ts`
- **Action**: Use transformation functions when returning data
- **Estimated Time**: 2 hours

**Example**:
```typescript
import { userProfileToClient } from "@/lib/db/transformers";

export async function getClientData(userId: string) {
  const profile = await repo.getProfile(userId);
  const additionalData = await getAdditionalClientData(userId);

  return userProfileToClient(profile, additionalData);
}
```

**Validation**: `npm run test subscribers/[id]`

---

### Day 8: Update Components

#### Task 4.5: Verify component imports
- **Files**: All components using types from types.ts
- **Action**: Ensure no breaking changes
- **Estimated Time**: 2 hours

#### Task 4.6: Update factories for DTOs
- **File**: `src/test/factories.ts`
- **Action**: Add factories for all DTOs
- **Estimated Time**: 2 hours

**Phase 4 Checkpoint**: Run full test suite + manual testing
```bash
npm run test:run
npm run build
```

---

## Phase 5: Component Imports (LOW PRIORITY - 1 day)

**Goal**: Fix component imports to use view-specific types

### Day 9: Fix Component Imports

#### Task 5.1: Update subscribers-table.tsx
- **File**: `src/app/(dashboard)/subscribers/_components/subscribers-table.tsx`
- **Line**: 10
- **Action**: Import SubscriberTableRow instead of UserProfile
- **Estimated Time**: 30 minutes

**Before**:
```typescript
import type { UserProfile } from "@/lib/db/schema";
```

**After**:
```typescript
import type { SubscriberTableRow } from "@/lib/db/types";
```

#### Task 5.2: Update goals-section.tsx and related
- **Files**: Component files importing from ../types
- **Action**: Ensure they use DTOs from centralized types
- **Estimated Time**: 1 hour

**Validation**: `npm run build && npm run lint`

---

## Phase 6: Validation & Documentation (1 day)

### Day 10: Final Validation

#### Task 6.1: Full test suite
```bash
npm run test:run
npm run test:coverage
```
**Goal**: 100% tests passing

#### Task 6.2: Build validation
```bash
npm run build
npx tsc --noEmit
```
**Goal**: Zero TypeScript errors

#### Task 6.3: Smoke test: Add a new field
- Add `testField` to `userProfiles` schema
- Run migration
- Update factory
- Verify only 1-2 files need changes

#### Task 6.4: Update documentation
- Update CLAUDE.md with new patterns
- Update TESTING.md with examples
- Create ARCHITECTURE.md explaining type layers

#### Task 6.5: Team knowledge sharing
- Create PR with detailed description
- Document migration patterns for future fields
- Share learnings

---

## Success Metrics

### Before Refactor
- Adding schema field: 12+ files to update
- Coupling points: ~380
- Test brittleness: HIGH
- Schema evolution risk: HIGH

### After Refactor
- Adding schema field: 1-2 files to update (schema + factory)
- Coupling points: ~20 (only factory + view models)
- Test brittleness: LOW
- Schema evolution risk: LOW

### Reduction
- **95% fewer coupling points**
- **92% fewer files to touch**
- **~90% reduction in breaking changes**

---

## Emergency Rollback Plan

If issues arise during migration:

1. **Each phase is independent** - can pause between phases
2. **Git branch per phase** - easy to rollback
3. **Tests validate each step** - catch issues early
4. **Production unaffected** - types are compile-time only

---

## Task Tracking

Use this checklist for tracking:

### Phase 2: Test Files ⏳
- [ ] Task 2.1: subscribers-table.test.tsx
- [ ] Task 2.2: user-profiles/[id]/route.unit.test.ts
- [ ] Task 2.3: user-profiles/by-email/route.unit.test.ts
- [ ] Task 2.4: user-profiles/check/route.unit.test.ts
- [ ] Task 2.5: Create Client factory
- [ ] Task 2.6: client-page-wrapper.test.tsx
- [ ] Checkpoint: Run full test suite

### Phase 3: Repository Layer ⏳
- [ ] Task 3.1: goals.repo.ts types
- [ ] Task 3.2: Create Goal factory
- [ ] Task 3.3: Update goal tests
- [ ] Task 3.4: routine.repo.ts types
- [ ] Task 3.5: Create RoutineProduct factory
- [ ] Task 3.6: Update routine tests
- [ ] Task 3.7: dashboard.repo.ts DTOs
- [ ] Checkpoint: Run full test suite

### Phase 4: Component Types ⏳
- [ ] Task 4.1: Add DTOs to types.ts
- [ ] Task 4.2: Create transformers.ts
- [ ] Task 4.3: Refactor component types.ts
- [ ] Task 4.4: Update server actions
- [ ] Task 4.5: Verify component imports
- [ ] Task 4.6: Update DTO factories
- [ ] Checkpoint: Run tests + build

### Phase 5: Component Imports ⏳
- [ ] Task 5.1: subscribers-table.tsx
- [ ] Task 5.2: goals-section.tsx and related
- [ ] Checkpoint: Build + lint

### Phase 6: Validation ⏳
- [ ] Task 6.1: Full test suite
- [ ] Task 6.2: Build validation
- [ ] Task 6.3: Smoke test new field
- [ ] Task 6.4: Update documentation
- [ ] Task 6.5: Knowledge sharing

---

## Timeline

| Phase | Duration | Days | Status |
|-------|----------|------|--------|
| Phase 1: Foundation | - | - | ✅ COMPLETE |
| Phase 2: Test Files | 3 days | Day 1-3 | ⏳ READY |
| Phase 3: Repository Layer | 2 days | Day 4-5 | ⏳ PENDING |
| Phase 4: Component Types | 3 days | Day 6-8 | ⏳ PENDING |
| Phase 5: Component Imports | 1 day | Day 9 | ⏳ PENDING |
| Phase 6: Validation | 1 day | Day 10 | ⏳ PENDING |
| **TOTAL** | **10 days** | | |

---

## Next Step

**START HERE**: Task 2.1 - Update subscribers-table.test.tsx

Ready to begin? Run:
```bash
git checkout -b refactor/test-files-phase2
```
