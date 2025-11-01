# Type System Guide

## Overview

This guide explains how to work with types in this codebase to avoid breaking changes when adding new database fields.

**KEY PRINCIPLE**: Never manually duplicate types. Always derive from the schema.

---

## CRITICAL: Database Types - Single Source of Truth

**ALL database types are defined in `lib/db/schema.ts` using Drizzle's `$inferSelect` / `$inferInsert` pattern.**

There is NO separate `lib/db/types.ts` file - that would be duplication!

### ✅ CORRECT Pattern - Types in schema.ts

```typescript
// lib/db/schema.ts
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(),
  firstName: text("first_name").notNull(),
  // ... other fields
});

// Auto-derive types using Drizzle's shorthand
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
```

### lib/db/index.ts - Re-exports + DrizzleDB Type

```typescript
// lib/db/index.ts
export const db = drizzle(client, { schema });

// Database instance type for dependency injection
export type DrizzleDB = typeof db;

// Re-export all schema types
export * from "./schema";

// Backward compatibility aliases (Row suffix)
export type {
  UserProfile as UserProfileRow,
  SkincareGoal as SkincareGoalRow,
  // ... etc
} from "./schema";
```

### ❌ WRONG - Creating a Separate types.ts File

```typescript
// ❌ DON'T CREATE lib/db/types.ts - This duplicates schema.ts!
import { type InferSelectModel } from "drizzle-orm";
import * as schema from "./schema";

// ❌ This is duplication - schema.ts already has these!
export type UserProfileRow = InferSelectModel<typeof schema.userProfiles>;
```

### ❌ WRONG - Derived Types in lib/db/

```typescript
// ❌ DON'T PUT THIS IN lib/db/ - belongs in repository!
export type SubscriberTableRow = Pick<
  UserProfileRow,
  "id" | "email" | "firstName"
>;
```

**WHY NO SEPARATE types.ts?**
- Drizzle's `$inferSelect` is the recommended pattern
- `schema.ts` is already the single source of truth
- Duplication = maintenance nightmare
- `lib/db/index.ts` re-exports everything from schema

**WHERE TO PUT DERIVED TYPES (Pick/Omit)?**
- Repository types → In the repository file
- Component types → In the component/feature directory
- API DTOs → In the API route file

This keeps types colocated with their usage and follows the single responsibility principle.

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
│ src/lib/db/schema.ts (ONLY SOURCE OF TRUTH)                 │
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
                             │ InferSelectModel (auto-derive)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ src/lib/db/types.ts (BASE TYPES ONLY)                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  // ✅ ONLY this - auto-derived from schema             │ │
│ │  export type UserProfileRow =                           │ │
│ │    InferSelectModel<typeof schema.userProfiles>         │ │
│ │                                                          │ │
│ │  export type DrizzleDB =                                │ │
│ │    ReturnType<typeof drizzle<typeof schema>>            │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ Import base row type
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ Repositories (DERIVE THEIR OWN TYPES)                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  // repos/subscriber.repo.ts                            │ │
│ │  import { type UserProfileRow } from "@/lib/db/types";  │ │
│ │                                                          │ │
│ │  export type SubscriberTableRow = Pick<                 │ │
│ │    UserProfileRow,                                       │ │
│ │    "id" | "email" | "firstName" | "lastName"            │ │
│ │  >                                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ Import from repo
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ Components, Tests (USE REPO TYPES)                          │
│ - Import from repositories where types are defined          │
│ - Types are colocated with their usage                      │
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

### 1. Define Repository Types Using Pick/Omit (IN THE REPO FILE)

```typescript
// src/app/(dashboard)/subscribers/[id]/goal-actions/goals.repo.ts
import { type InferSelectModel } from "drizzle-orm";
import { skincareGoals } from "@/lib/db/schema";

// ✅ CORRECT OPTION 1: Derive directly from schema in the repo file
export type Goal = Pick<
  InferSelectModel<typeof skincareGoals>,
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

// ✅ CORRECT OPTION 2: Import base row type, then Pick
import { type SkincareGoalRow } from "@/lib/db/types";

export type Goal = Pick<
  SkincareGoalRow,
  | "id"
  | "templateId"
  | "description"
  // ...
>;

// ❌ WRONG: Manual type duplication (hardcoded fields)
export type Goal = {
  id: string;
  templateId: string;
  description: string;
  // ... manually typing fields - NO! Schema is source of truth!
};

// ❌ WRONG: Importing from lib/db/types where this Pick is defined
// That would mean the type is in the wrong place - it belongs HERE in the repo
import { type Goal } from "@/lib/db/types"; // NO!
```

**KEY POINT**: The Pick/Omit happens IN THE REPOSITORY FILE, not in lib/db/types.ts. This keeps types colocated with their usage.

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

## Return Type Inference

**CRITICAL RULE**: Let TypeScript infer return types. Don't explicitly type them!

### ✅ CORRECT - Inferred Return Types

```typescript
// admins.repo.ts
export function makeAdminsRepo() {
  return {
    async create(data: NewAdmin) {
      const [admin] = await db.insert(admins).values(data).returning();
      return admin;
    },

    async findByEmail(email: string) {
      const [admin] = await db
        .select()
        .from(admins)
        .where(eq(admins.email, email))
        .limit(1);
      return admin;
    },
  };
}

// TypeScript infers the return types automatically from the implementation!
// Usage:
const adminsRepo = makeAdminsRepo();
const admin = await adminsRepo.findByEmail('test@example.com');
// TypeScript knows admin is Admin | undefined
```

### ❌ WRONG - Explicit Return Types

```typescript
// ❌ DON'T DO THIS - explicit return types are maintenance burden
export function makeAdminsRepo() {
  return {
    async create(data: NewAdmin): Promise<Admin> {  // ❌ Remove this
      const [admin] = await db.insert(admins).values(data).returning();
      return admin;
    },

    async findByEmail(email: string): Promise<Admin | undefined> {  // ❌ Remove this
      const [admin] = await db
        .select()
        .from(admins)
        .where(eq(admins.email, email))
        .limit(1);
      return admin;
    },
  };
}
```

**Why Infer?**
1. **Less code** - no duplicate type annotations
2. **Always accurate** - return type matches implementation automatically
3. **Easier refactoring** - change implementation, type updates automatically
4. **TypeScript is smart** - it knows the types from your code

**When to use explicit return types:**
- Public API functions that are part of your library's interface
- When you want to intentionally widen a narrow type
- Never in internal repositories/helpers

---

## Rules to Never Break

### ❌ DON'T

1. **Don't manually duplicate types (hardcode fields)**
   ```typescript
   // ❌ WRONG - manually typing fields instead of deriving from schema
   type User = {
     id: string;
     name: string;
     email: string;
     // What happens when you add a field to the schema? This breaks!
   };
   ```

2. **Don't create test objects manually**
   ```typescript
   // ❌ WRONG
   const user = {
     id: "1",
     firstName: "John",
     lastName: "Doe",
     // ... 30 more fields you have to type manually
   };
   ```

3. **Don't import from schema in components**
   ```typescript
   // ❌ WRONG - components should use repository types
   import type { UserProfile } from "@/lib/db/schema";
   ```

4. **Don't put derived types (Pick/Omit) in lib/db/types.ts**
   ```typescript
   // ❌ WRONG LOCATION - this belongs in the repository/component file
   // File: src/lib/db/types.ts
   export type SubscriberTableRow = Pick<
     UserProfileRow,
     "id" | "email" | "firstName"
   >;
   ```

5. **Don't use eslint-disable for `any` types - create proper types instead**
   ```typescript
   // ❌ WRONG - lazy workaround
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   db: typeof db | any;

   // ✅ CORRECT - proper type
   db: DrizzleDB;
   ```

6. **Don't explicitly type return types in repositories - let TypeScript infer**
   ```typescript
   // ❌ WRONG - explicit return types
   async findByEmail(email: string): Promise<Admin | undefined> {
     // ...
   }

   // ✅ CORRECT - inferred return type
   async findByEmail(email: string) {
     // TypeScript infers Promise<Admin | undefined> automatically
   }
   ```

### ✅ DO

1. **Always derive types from schema using InferSelectModel**
   ```typescript
   // ✅ CORRECT - in repository file
   import { type InferSelectModel } from "drizzle-orm";
   import { users } from "@/lib/db/schema";

   type User = InferSelectModel<typeof users>;
   type UserCard = Pick<User, "id" | "name" | "email">;
   ```

2. **Always use factories in tests**
   ```typescript
   // ✅ CORRECT
   const user = makeUserProfile({ firstName: "John" });
   ```

3. **Always import base row types from lib/db/types, derive in your file**
   ```typescript
   // ✅ CORRECT
   import { type UserProfileRow } from "@/lib/db/types";

   // Then derive in THIS file (repo/component)
   export type SubscriberTableRow = Pick<
     UserProfileRow,
     "id" | "email" | "firstName"
   >;
   ```

4. **Always colocate types with their usage**
   ```typescript
   // ✅ CORRECT - repository types defined in repository file
   // File: goals.repo.ts
   export type Goal = Pick<SkincareGoalRow, "id" | "description">;

   // ✅ CORRECT - component types defined with component
   // File: subscriber-table.tsx
   import { type UserProfileRow } from "@/lib/db/types";
   type TableRow = Pick<UserProfileRow, "id" | "email">;
   ```

5. **Always use proper types - never `any` or eslint-disable**
   ```typescript
   // ✅ CORRECT
   import { type DrizzleDB } from "@/lib/db/types";

   export type RoutineDeps = {
     db: DrizzleDB;  // Proper type for dependency injection
     now: () => Date;
   };
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
