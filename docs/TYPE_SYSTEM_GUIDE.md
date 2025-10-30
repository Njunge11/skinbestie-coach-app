# Type System Guide

## Overview

This guide explains how to work with types in this codebase to avoid breaking changes when adding new database fields.

**KEY PRINCIPLE**: Never manually duplicate types. Always derive from the schema.

---

## The Problem We Solved

**Before**: Adding a single optional field (`nickname`) to the database broke 12+ files across tests, components, and APIs.

**After**: Adding new fields only requires updating 2 files:
1. The schema definition
2. The test factory

---

## Architecture: Single Source of Truth

```
┌─────────────────────────────────────────────────────────────┐
│ src/lib/db/schema.ts                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  export const userProfiles = pgTable("user_profiles", {│ │
│ │    id: uuid("id").primaryKey(),                         │ │
│ │    firstName: text("first_name").notNull(),             │ │
│ │    nickname: text("nickname"),  // ← NEW FIELD          │ │
│ │    ...                                                   │ │
│ │  })                                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ InferSelectModel
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ src/lib/db/types.ts                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  export type UserProfileRow =                           │ │
│ │    InferSelectModel<typeof schema.userProfiles>         │ │
│ │                                                          │ │
│ │  export type SubscriberTableRow = Pick<                 │ │
│ │    UserProfileRow,                                       │ │
│ │    "id" | "email" | "firstName" | "lastName"            │ │
│ │  >                                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ Pick/Omit
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ Repositories, Components, Tests                             │
│ - All derive from centralized types                         │
│ - Changes propagate automatically                           │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── lib/db/
│   ├── schema.ts          # Database schema (Drizzle)
│   └── types.ts           # Centralized type definitions
├── test/
│   └── factories.ts       # Test data factories
└── app/
    └── (dashboard)/
        └── subscribers/[id]/
            ├── types.ts   # Component DTOs (re-exports from repos)
            ├── goal-actions/
            │   └── goals.repo.ts       # Repository types
            └── _components/
                └── goals-section.tsx    # Uses types from ../types
```

---

## How to Add a New Database Field

### Step 1: Update Schema

```typescript
// src/lib/db/schema.ts
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(),
  firstName: text("first_name").notNull(),
  nickname: text("nickname"), // ← Add new field here
  // ...
});
```

### Step 2: Generate Migration

```bash
npm run db:generate
npm run db:migrate
```

### Step 3: Update Factory

```typescript
// src/test/factories.ts
export function makeUserProfile(
  overrides: Partial<UserProfileRow> = {}
): UserProfileRow {
  return {
    id: crypto.randomUUID(),
    firstName: "Test",
    lastName: "User",
    nickname: null, // ← Add default value here
    // ... other fields
    ...overrides,
  };
}
```

**That's it!** All repositories, components, and tests automatically get the new field.

---

## How to Create a New Repository

### 1. Define Repository Types Using Pick

```typescript
// src/app/(dashboard)/subscribers/[id]/goal-actions/goals.repo.ts
import { type SkincareGoalRow } from "@/lib/db/types";

// ✅ CORRECT: Derive from schema using Pick
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

// ❌ WRONG: Manual type duplication
export type Goal = {
  id: string;
  templateId: string;
  description: string;
  // ... manually typing fields
};
```

### 2. Create Repository Functions

```typescript
export function makeGoalsRepo(deps: GoalsRepoDeps = {}) {
  const database = deps.db || db;

  return {
    async getGoalsByTemplate(templateId: string): Promise<Goal[]> {
      return await database
        .select()
        .from(schema.skincareGoals)
        .where(eq(schema.skincareGoals.templateId, templateId))
        .orderBy(asc(schema.skincareGoals.order));
    },

    async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal | null> {
      const result = await database
        .update(schema.skincareGoals)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(schema.skincareGoals.id, id))
        .returning();

      return result[0] || null;
    },
  };
}
```

### 3. Create Test Factory

```typescript
// src/test/factories.ts
import type { Goal } from "@/app/(dashboard)/subscribers/[id]/goal-actions/goals.repo";

export function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: crypto.randomUUID(),
    templateId: crypto.randomUUID(),
    description: "Test goal",
    isPrimaryGoal: false,
    complete: false,
    completedAt: null,
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

---

## How to Create Component Types

### Option 1: Re-export from Repository (Recommended)

```typescript
// src/app/(dashboard)/subscribers/[id]/types.ts
import type { Goal as GoalRepo } from "./goal-actions/goals.repo";
import type { Routine as RoutineRepo } from "./routine-info-actions/routine.repo";

// Re-export repository types for component use
export type Goal = GoalRepo;
export type Routine = RoutineRepo;
```

### Option 2: Derive from Schema Types

```typescript
// src/app/(dashboard)/subscribers/[id]/types.ts
import type { ProgressPhotoRow } from "@/lib/db/types";

export type Photo = Pick<
  ProgressPhotoRow,
  "id" | "weekNumber" | "uploadedAt" | "feedback" | "imageUrl"
>;
```

### Option 3: Computed View Models (when needed)

For types that don't map 1:1 with database tables:

```typescript
// src/app/(dashboard)/subscribers/[id]/types.ts

// This is a computed view - fields are derived from multiple sources
export interface Client {
  id: string;
  name: string;        // Computed from firstName + lastName
  age: number;         // Computed from dateOfBirth
  email: string;
  skinType: string;    // Array joined to string
  planWeeks: number;   // From goals template
  currentWeek: number; // Computed
  hasRoutine: boolean; // Derived from routine existence
}
```

---

## How to Write Tests

### Use Factories, Not Manual Objects

```typescript
// ✅ CORRECT: Use factories
import { makeUserProfile, makeGoal, makeRoutine } from "@/test/factories";

it("updates user nickname", async () => {
  const user = makeUserProfile({
    id: "user-1",
    firstName: "John",
    // Only specify fields relevant to this test
    // Factory provides defaults for everything else
  });

  const result = await updateProfile(user.id, { nickname: "JD" });
  expect(result.nickname).toBe("JD");
});

// ❌ WRONG: Manual object literals
it("updates user nickname", async () => {
  const user = {
    id: "user-1",
    userId: "auth-1",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phoneNumber: "+1234567890",
    dateOfBirth: new Date("1990-01-01"),
    nickname: null,        // ← If you add a field to schema,
    occupation: null,      //   you have to add it here manually
    bio: null,
    timezone: "UTC",
    // ... 20 more fields
  };
});
```

### Factory Benefits

1. **Only specify what matters**: `makeUserProfile({ firstName: "Jane" })`
2. **Defaults for everything else**: All fields get sensible defaults
3. **Future-proof**: New schema fields don't break existing tests
4. **Type-safe**: TypeScript ensures you only pass valid fields

---

## Common Patterns

### 1. View-Specific Types

```typescript
// src/lib/db/types.ts

// For subscriber table (only fields shown in table)
export type SubscriberTableRow = Pick<
  UserProfileRow,
  | "id"
  | "email"
  | "firstName"
  | "lastName"
  | "isCompleted"
  | "hasCompletedSkinTest"
  | "hasCompletedBooking"
  | "createdAt"
  | "updatedAt"
>;

// For profile cards (minimal display)
export type UserProfileCard = Pick<
  UserProfileRow,
  "id" | "firstName" | "lastName" | "email" | "nickname"
>;
```

### 2. Form Data Types

```typescript
// For forms, use Omit to exclude system-managed fields
export type ProfileFormData = Omit<
  UserProfileRow,
  "id" | "userId" | "createdAt" | "updatedAt"
>;
```

### 3. API DTOs

```typescript
// For API responses
export type UserProfilePublic = Omit<
  UserProfileRow,
  "userId" // Hide internal fields from API
>;

// For partial updates
export type ProfileUpdateData = Partial<
  Omit<UserProfileRow, "id" | "userId" | "createdAt" | "updatedAt">
>;
```

---

## Testing Pattern

### Repository Tests (Integration with PGlite)

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { makeGoalsRepo } from "./goals.repo";
import { makeGoal } from "@/test/factories";
import * as schema from "@/lib/db/schema";

describe("GoalsRepo - Integration Tests", () => {
  let testDb: PGlite;
  let db: ReturnType<typeof drizzle>;

  beforeEach(async () => {
    testDb = new PGlite();
    db = drizzle(testDb, { schema });
    // Run migrations...
  });

  afterEach(async () => {
    await testDb.close();
  });

  it("creates a goal", async () => {
    const repo = makeGoalsRepo({ db });
    const goal = makeGoal({ description: "Clear skin" });

    const created = await repo.createGoal(goal);

    expect(created.description).toBe("Clear skin");
  });
});
```

### Service Tests (Unit with Mocked Repo)

```typescript
import { describe, it, expect, vi } from "vitest";
import { makeGoalsService } from "./goals.service";
import { makeGoal } from "@/test/factories";

describe("GoalsService", () => {
  it("returns goals for template", async () => {
    const mockRepo = {
      getGoalsByTemplate: vi.fn().mockResolvedValue([
        makeGoal({ description: "Goal 1" }),
        makeGoal({ description: "Goal 2" }),
      ]),
    };

    const service = makeGoalsService({ repo: mockRepo });
    const result = await service.getGoals("template-1");

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });
});
```

---

## Checklist: Adding a New Entity

- [ ] 1. Define schema in `src/lib/db/schema.ts`
- [ ] 2. Add base row type in `src/lib/db/types.ts` using `InferSelectModel`
- [ ] 3. Generate migration: `npm run db:generate`
- [ ] 4. Run migration: `npm run db:migrate`
- [ ] 5. Create repository with types derived from schema
- [ ] 6. Create factory in `src/test/factories.ts`
- [ ] 7. Write repository tests using PGlite
- [ ] 8. Create service layer (if needed)
- [ ] 9. Write service tests with mocked repo
- [ ] 10. Create component types (re-export or derive)
- [ ] 11. Write component tests using factories

---

## Rules to Never Break

### ❌ DON'T

1. **Don't manually duplicate types**
   ```typescript
   // ❌ WRONG
   type User = { id: string; name: string; email: string };
   ```

2. **Don't create test objects manually**
   ```typescript
   // ❌ WRONG
   const user = { id: "1", firstName: "John", lastName: "Doe", ... };
   ```

3. **Don't import from schema in components**
   ```typescript
   // ❌ WRONG
   import type { UserProfile } from "@/lib/db/schema";
   ```

### ✅ DO

1. **Always derive types from schema**
   ```typescript
   // ✅ CORRECT
   type User = InferSelectModel<typeof schema.users>;
   type UserCard = Pick<User, "id" | "name" | "email">;
   ```

2. **Always use factories in tests**
   ```typescript
   // ✅ CORRECT
   const user = makeUserProfile({ firstName: "John" });
   ```

3. **Always import from centralized types**
   ```typescript
   // ✅ CORRECT
   import type { UserProfileRow } from "@/lib/db/types";
   import type { Goal } from "../goal-actions/goals.repo";
   ```

---

## Migration from Old Pattern

If you find code using the old pattern:

### Before (Manual Types)
```typescript
export interface Goal {
  id: string;
  description: string;
  complete: boolean;
  // ... manually typed
}
```

### After (Derived Types)
```typescript
import { type SkincareGoalRow } from "@/lib/db/types";

export type Goal = Pick<
  SkincareGoalRow,
  "id" | "description" | "complete" | "completedAt" | "order"
>;
```

---

## Summary

**The Golden Rule**: Schema is the single source of truth. Everything else derives from it.

```
Schema → Types → Repos → Services → Components
         ↓
      Factories → Tests
```

**When you add a field**:
1. Add to schema
2. Add default to factory
3. Done! Everything else updates automatically

**When things break**:
- Check if you're using factories in tests
- Check if types derive from schema (not manually duplicated)
- Check if components import from centralized types (not schema directly)

---

## Questions?

- See `docs/TESTING.md` for test patterns
- See `docs/REFACTOR_PLAN.md` for the full refactoring history
- See examples in existing repos: `goals.repo.ts`, `routine.repo.ts`
