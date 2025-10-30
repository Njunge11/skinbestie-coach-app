# Type System Violations Report

## Executive Summary

Audit Date: 2025-10-30

This report details the findings of a comprehensive audit of the codebase against the TYPE_SYSTEM_GUIDE.md rules. The audit examined 4 main categories of files: Repository files, Component files, Test files, and API Route files.

### Overall Compliance Score: 57%

| Category | Files Audited | Compliant | Violations | Compliance % |
|----------|---------------|-----------|------------|--------------|
| Repository Files (*.repo.ts) | 17 | 17 | 0 | **100%** ✅ |
| Component Files (*.tsx) | 49 | 49 | 0 | **100%** ✅ |
| Test Files (*.test.ts/tsx) | 50 | 3 | 47 | **6%** ❌ |
| API Routes (route.ts) | 13 | 4 | 9 | **31%** ❌ |
| **TOTAL** | **129** | **73** | **56** | **57%** |

---

## Category 1: Repository Files (*.repo.ts) - ✅ FULLY COMPLIANT

### Summary
- **Files Audited**: 17
- **Violations Found**: 0
- **Compliance**: 100%

### Details
All repository files correctly:
- Import from `@/lib/db/types` instead of `@/lib/db/schema`
- Use `Pick<>` or `Omit<>` patterns from centralized types
- Export their types properly

### Examples of Good Patterns
```typescript
// src/app/(dashboard)/subscribers/[id]/goal-actions/goals.repo.ts
import { type SkincareGoalRow } from "@/lib/db/types";

export type Goal = Pick<
  SkincareGoalRow,
  "id" | "templateId" | "description" | "isPrimaryGoal" | "complete"
>;
```

---

## Category 2: Component Files (*.tsx) - ✅ FULLY COMPLIANT

### Summary
- **Files Audited**: 49
- **Violations Found**: 0
- **Compliance**: 100%

### Details
All component files correctly:
- Never import from `@/lib/db/schema`
- Import types from `@/lib/db/types` or local `../types` files
- Follow the proper separation of concerns

### Examples of Good Patterns
```typescript
// Component imports from local types
import type { Goal, Routine } from "../types";

// Types file re-exports from repos
export type { Goal } from "./goal-actions/goals.repo";
```

---

## Category 3: Test Files - ❌ MAJOR VIOLATIONS

### Summary
- **Files Audited**: 50
- **Files Using Factories**: 3
- **Files with Manual Object Creation**: 47
- **Compliance**: 6%

### Critical Issues Found

#### 1. Factory Functions Exist But Are Not Used
The project has these factories defined but underutilized:
- `makeUserProfile()` - Used in only 3/50 test files
- `makeGoal()` - Used in only 1/50 test files
- `makeRoutine()` - Defined but NEVER USED
- `makeRoutineProduct()` - Defined but NEVER USED
- `makeCoachNote()` - Defined but NEVER USED
- `makePhoto()` - Defined but NEVER USED
- `makeClient()` - Defined but NEVER USED

#### 2. Manual Object Creation Pattern (Violation)
```typescript
// ❌ WRONG - Manual object creation
const mockAdmin = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "admin@example.com",
  name: "Admin User",
  passwordHash: null,
  passwordSet: false,
  role: "admin",
  createdAt: new Date("2025-01-15T10:00:00Z"),
  updatedAt: new Date("2025-01-15T10:00:00Z"),
};

// ✅ CORRECT - Should use factory
import { makeAdmin } from "@/test/factories";
const mockAdmin = makeAdmin({ email: "admin@example.com" });
```

### Files Needing Immediate Fix (Top Priority)

1. **src/app/api/admins/route.unit.test.ts** - Manual admin objects (lines 81-90, 129-138)
2. **src/lib/auth.integration.test.ts** - Manual DB inserts instead of factories (lines 16-21)
3. **src/app/(dashboard)/routine-management/template-actions/actions.unit.test.ts** - Manual template objects (lines 41-57)
4. **src/app/api/user-profiles/route.unit.test.ts** - Manual user profile objects (lines 99-117)
5. **src/app/api/consumer-app/dashboard/dashboard.repo.test.ts** - Manual DB inserts for all entities (lines 50-62)

---

## Category 4: API Routes - ❌ SIGNIFICANT VIOLATIONS

### Summary
- **Files Audited**: 13
- **Compliant Routes**: 4
- **Routes with Violations**: 9
- **Compliance**: 31%

### Critical Issues Found

#### 1. Manual Zod Schema Duplication
Multiple routes define their own Zod schemas instead of centralizing:

```typescript
// ❌ WRONG - Duplicated in multiple files
const createAdminSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
});

// ✅ CORRECT - Should be centralized
import { createAdminSchema } from "@/lib/db/validation";
```

#### 2. Manual Type Duplication in Response Schemas
```typescript
// ❌ WRONG - Manually duplicating UserProfileRow structure
data: z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  // ... manually typing all fields
})

// ✅ CORRECT - Should use Pick from centralized types
import type { UserProfileDTO } from "@/lib/db/types";
// Where UserProfileDTO = Pick<UserProfileRow, "id" | "firstName" | ...>
```

#### 3. Enum Duplication
```typescript
// ❌ WRONG - Redefining enum values
status: z.enum(['published', 'unpublished'])

// ✅ CORRECT - Should reference from schema
import { goalTemplateStatusEnum } from "@/lib/db/schema";
```

### Routes Needing Immediate Fix (Priority Order)

| File | Issue | Line Numbers |
|------|-------|--------------|
| **src/app/api/consumer-app/dashboard/route.ts** | Custom types file with complete DTO duplication | dashboard.types.ts |
| **src/app/api/consumer-app/profile/route.ts** | Custom types file duplicating UserProfileRow | profile.types.ts |
| **src/app/api/consumer-app/goals-template/route.ts** | Enum duplication, custom types file | goals-template.types.ts |
| **src/app/api/consumer-app/goals/route.ts** | Inline Zod schemas | lines 23-27 |
| **src/app/api/consumer-app/goals/[goalId]/route.ts** | Inline Zod schemas | lines 21-25, 27 |
| **src/app/api/consumer-app/goals/reorder/route.ts** | Inline schema definition | lines 19-22 |
| **src/app/api/consumer-app/goals/acknowledge/route.ts** | Inline schema definition | lines 18-21 |
| **src/app/api/admins/route.ts** | Manual schema definition | lines 8-11 |

---

## Detailed Violation Analysis

### Test Files with Most Violations

| File | Violations Count | Manual Objects Created |
|------|-----------------|------------------------|
| dashboard.repo.test.ts | 15+ | User profiles, goals, routines |
| auth.integration.test.ts | 10+ | Admin objects, tokens |
| actions.unit.test.ts | 12+ | Templates, products |
| route.unit.test.ts (multiple) | 8+ each | Various DTOs |

### API Routes with Custom Type Files (Need Deletion)

These files should be deleted and replaced with centralized types:
1. `src/app/api/consumer-app/profile/profile.types.ts` - 50+ lines of duplicated types
2. `src/app/api/consumer-app/goals-template/goals-template.types.ts` - 40+ lines
3. `src/app/api/consumer-app/dashboard/dashboard.types.ts` - 80+ lines

---

## Recommendations (Priority Order)

### Immediate Actions (High Priority)

#### 1. Fix Test Files (47 files)
```bash
# Example fix for one file:
# Before:
const user = {
  id: "123",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  // ... 20 more fields
};

# After:
import { makeUserProfile } from "@/test/factories";
const user = makeUserProfile({
  firstName: "John",
  lastName: "Doe"
});
```

**Action Required**:
- Add factory imports to all test files
- Replace manual object creation with factory calls
- Create missing factories: `makeAdmin()`, `makeTemplate()`, `makeBooking()`

#### 2. Centralize API Validation Schemas
Create new file: `src/lib/db/validation.ts`
```typescript
import { z } from "zod";
import type { UserProfileRow, SkincareGoalRow } from "./types";

// Request schemas
export const createAdminSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

export const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  nickname: z.string().optional(),
});

// Response DTOs using Pick
export type UserProfileDTO = Pick<
  UserProfileRow,
  "id" | "firstName" | "lastName" | "email" | "updatedAt"
>;

export type GoalDTO = Pick<
  SkincareGoalRow,
  "id" | "description" | "complete" | "completedAt" | "order"
>;
```

#### 3. Remove Custom Type Files and Update Routes
Delete these files and update the routes to use centralized types:
- `profile.types.ts` → Use `@/lib/db/validation`
- `goals-template.types.ts` → Use `@/lib/db/validation`
- `dashboard.types.ts` → Use `@/lib/db/validation`

### Medium Priority Actions

1. **Add ESLint Rules**
```javascript
// .eslintrc.js
{
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/lib/db/schema'],
            message: 'Import from @/lib/db/types instead'
          }
        ]
      }
    ]
  }
}
```

2. **Update Testing Documentation**
Add to `docs/TESTING.md`:
- Factory usage requirements
- Examples of correct test patterns
- List of available factories

### Low Priority Actions

1. Add pre-commit hooks to check for type violations
2. Create code snippets for common patterns
3. Add automated migration scripts

---

## Files Needing Fixes (Complete List)

### Test Files (47 files) - Critical Priority
```
src/app/api/admins/route.unit.test.ts
src/lib/auth.integration.test.ts
src/app/(dashboard)/routine-management/template-actions/actions.unit.test.ts
src/actions/auth.unit.test.ts
src/app/(dashboard)/actions.unit.test.ts
src/app/api/user-profiles/route.unit.test.ts
src/lib/auth.test.ts
src/app/api/consumer-app/dashboard/route.unit.test.ts
src/app/api/consumer-app/dashboard/dashboard.repo.test.ts
src/app/(dashboard)/subscribers/[id]/_components/routine-section.test.tsx
src/app/(dashboard)/subscribers/[id]/_components/client-page-wrapper.test.tsx
src/app/api/user-profiles/check/route.unit.test.ts
src/app/api/user-profiles/by-email/route.unit.test.ts
# ... and 34 more files
```

### API Route Files (9 files) - High Priority
```
src/app/api/admins/route.ts
src/app/api/consumer-app/profile/route.ts
src/app/api/consumer-app/goals-template/route.ts
src/app/api/consumer-app/dashboard/route.ts
src/app/api/consumer-app/goals/route.ts
src/app/api/consumer-app/goals/[goalId]/route.ts
src/app/api/consumer-app/goals/reorder/route.ts
src/app/api/consumer-app/goals/acknowledge/route.ts
```

### Custom Type Files to Delete (3 files) - High Priority
```
src/app/api/consumer-app/profile/profile.types.ts
src/app/api/consumer-app/goals-template/goals-template.types.ts
src/app/api/consumer-app/dashboard/dashboard.types.ts
```

---

## Success Metrics

After implementing the fixes:
- Test files should have 100% factory usage (no manual object creation)
- API routes should have 0 inline Zod schemas (all centralized)
- No custom .types.ts files in consumer-app directory
- All API DTOs defined in @/lib/db/types.ts or @/lib/db/validation.ts
- Overall compliance should reach 100%

---

## Estimated Effort

| Task | Files | Effort | Priority |
|------|-------|--------|----------|
| Update test files to use factories | 47 | 8-12 hours | Critical |
| Create missing factory functions | ~5 | 1-2 hours | Critical |
| Centralize API validation schemas | 9 | 3-4 hours | High |
| Create API DTOs in types.ts | ~10 | 2-3 hours | High |
| Remove custom type files | 3 | 1 hour | High |
| Documentation updates | 2 | 1 hour | Medium |
| **Total** | **76** | **16-23 hours** | - |

---

## Impact if Not Fixed

### Current State (with violations)
When adding a new field to the database:
1. Must update 47+ test files manually
2. Must update 9+ API route files
3. Must update 3+ custom type files
4. Risk of missing updates causing runtime errors
5. Tests break immediately requiring hours of fixes

### Desired State (following guide)
When adding a new field to the database:
1. Update only `schema.ts`
2. Update factory in `factories.ts`
3. All types automatically propagate
4. Tests continue working with new defaults
5. TypeScript catches all breaking changes at compile time

---

## Conclusion

The repository and component layers show excellent compliance (100%), demonstrating the team understands and can implement the type system correctly. However, the test layer (6% compliance) and API layer (31% compliance) have critical violations that significantly impact maintainability.

**Key Finding**: 94% of test files are not using the factory pattern, making them extremely brittle to schema changes. This is the most critical issue to address.

**Recommendation**: Focus first on updating test files to use factories (highest ROI), then centralize API validation schemas. These changes will reduce maintenance burden by ~80% when schema changes occur.

The investment of 16-23 hours to fix these violations will save hundreds of hours in future maintenance and debugging, while also preventing production bugs from type mismatches.