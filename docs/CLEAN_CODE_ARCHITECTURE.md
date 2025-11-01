# Clean Code Architecture Guide

This document defines the architectural standards for maintaining clean, maintainable code in this Next.js application.

## Table of Contents
1. [Core Principles](#core-principles)
2. [Feature-Based Colocation](#feature-based-colocation)
3. [Type System Guidelines](#type-system-guidelines)
4. [UI Components Structure](#ui-components-structure)
5. [Server Actions Structure](#server-actions-structure)
6. [API Routes Structure](#api-routes-structure)
7. [Testing Standards](#testing-standards)
8. [Code Review Checklist](#code-review-checklist)

---

## Core Principles

### DRY (Don't Repeat Yourself)
**Never duplicate code.** If you write something twice, extract it.

❌ **Bad: Duplicated type definitions**
```typescript
// feature-a/actions.ts
type Result<T> = { success: true; data: T } | { success: false; error: string };

// feature-b/actions.ts
type Result<T> = { success: true; data: T } | { success: false; error: string };
```

✅ **Good: Single source of truth**
```typescript
// lib/result.ts
export type Result<T> = { success: true; data: T } | { success: false; error: string };

// feature-a/actions.ts
import type { Result } from "@/lib/result";

// feature-b/actions.ts
import type { Result } from "@/lib/result";
```

### Single Responsibility Principle
**Each file/function should do ONE thing.**

❌ **Bad: 955-line file with multiple responsibilities**
```typescript
// actions.ts (955 lines)
export function getUser() {}
export function createUser() {}
export function updateUser() {}
export function publishUser() {}
// ... 20 more functions
```

✅ **Good: Focused files**
```typescript
// user-crud.ts (100 lines)
export function getUser() {}
export function createUser() {}
export function deleteUser() {}

// user-publishing.ts (150 lines)
export function publishUser() {}

// actions.ts (20 lines) - Barrel file
export { getUser, createUser, deleteUser } from "./user-crud";
export { publishUser } from "./user-publishing";
```

---

## Feature-Based Colocation

**Organize code by feature, not by type.** Related files should live together.

### ❌ Bad: Type-Based Organization
```
src/
├── components/
│   ├── UserProfile.tsx
│   └── UserSettings.tsx
├── actions/
│   ├── user-actions.ts
│   └── settings-actions.ts
├── tests/
│   ├── UserProfile.test.tsx
│   └── user-actions.test.ts
└── types/
    └── user-types.ts
```

### ✅ Good: Feature-Based Organization
```
src/
└── app/(dashboard)/users/[id]/
    ├── page.tsx                    # Main route
    ├── _components/
    │   ├── user-profile.tsx         # UI component
    │   ├── user-profile.test.tsx    # Component test (colocated)
    │   ├── user-settings.tsx
    │   └── user-settings.test.tsx
    └── user-actions/
        ├── actions.ts               # Barrel file
        ├── validation.ts            # Zod schemas + derived types
        ├── user-crud.ts             # CRUD operations
        ├── user-crud.test.ts        # Tests (colocated)
        ├── user-publishing.ts
        └── user-publishing.test.ts
```

**Rationale:** When working on the user profile feature, all related files are in one place. No jumping between distant folders.

---

## Type System Guidelines

### Rule 1: Derive Types from Zod Schemas

**Never manually define types that match Zod schemas.** Use `z.infer`.

❌ **Bad: Duplicate definitions**
```typescript
// validation.ts
export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

// types.ts (DUPLICATE!)
export type CreateUserInput = {
  name: string;
  email: string;
};
```

✅ **Good: Single source of truth**
```typescript
// validation.ts
export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

// Derive type from schema
export type CreateUserInput = z.infer<typeof createUserSchema>;
```

**Why:** Schema is the source of truth. Types automatically stay in sync.

### Rule 2: Use Pick/Omit for Derived Types

**Don't redefine subsets of existing types.**

❌ **Bad: Redefining fields**
```typescript
export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
};

// DUPLICATE FIELDS!
export type UserPublicInfo = {
  id: string;
  name: string;
  email: string;
};
```

✅ **Good: Derive with Pick/Omit**
```typescript
export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
};

// Automatically stays in sync
export type UserPublicInfo = Omit<User, "password">;
// or
export type UserPublicInfo = Pick<User, "id" | "name" | "email">;
```

### Rule 3: Database Types from Schema

**Use Drizzle's generated types, not manual definitions.**

❌ **Bad: Manual type definition**
```typescript
export type UserRow = {
  id: string;
  name: string;
  email: string;
  created_at: Date;
};
```

✅ **Good: Use Drizzle inference**
```typescript
import { users } from "@/lib/db/schema";
import type { InferSelectModel } from "drizzle-orm";

export type UserRow = InferSelectModel<typeof users>;
```

---

## UI Components Structure

### File Organization

```
feature/
├── page.tsx                    # Route entry point
└── _components/
    ├── feature-card.tsx        # Component
    ├── feature-card.test.tsx   # Component test (colocated)
    ├── feature-list.tsx
    ├── feature-list.test.tsx
    └── feature-dialog.tsx
```

### Component File Structure

**Every component should follow this pattern:**

```typescript
// feature-card.tsx
"use client";

import { useState } from "react";
import { useTransition } from "react";
import { updateFeature } from "../feature-actions/actions";

// 1. Types (derived from props or actions)
type FeatureCardProps = {
  feature: Feature;
  onUpdate?: () => void;
};

// 2. Component
export function FeatureCard({ feature, onUpdate }: FeatureCardProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = () => {
    startTransition(async () => {
      const result = await updateFeature(feature.id, { status: "active" });
      if (result.success) {
        onUpdate?.();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div>
      <h3>{feature.name}</h3>
      {error && <p className="text-red-500">{error}</p>}
      <button onClick={handleUpdate} disabled={isPending}>
        Update
      </button>
    </div>
  );
}
```

### Component Test Structure

**Tests should be colocated and follow user behavior patterns:**

```typescript
// feature-card.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FeatureCard } from "./feature-card";
import * as actions from "../feature-actions/actions";

// Mock server actions
vi.mock("../feature-actions/actions", () => ({
  updateFeature: vi.fn(),
}));

describe("FeatureCard", () => {
  it("user updates feature successfully", async () => {
    // Arrange
    vi.mocked(actions.updateFeature).mockResolvedValue({
      success: true,
      data: { id: "1", status: "active" },
    });
    const onUpdate = vi.fn();

    // Act
    render(<FeatureCard feature={{ id: "1", name: "Test" }} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole("button", { name: /update/i }));

    // Assert
    await waitFor(() => {
      expect(actions.updateFeature).toHaveBeenCalledWith("1", { status: "active" });
      expect(onUpdate).toHaveBeenCalled();
    });
  });

  it("user sees error when update fails", async () => {
    // Arrange
    vi.mocked(actions.updateFeature).mockResolvedValue({
      success: false,
      error: "Update failed",
    });

    // Act
    render(<FeatureCard feature={{ id: "1", name: "Test" }} />);
    fireEvent.click(screen.getByRole("button", { name: /update/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Update failed")).toBeInTheDocument();
    });
  });
});
```

**Testing Best Practices:**
- ✅ Test user behavior, not implementation
- ✅ Use `getByRole` over `getByTestId`
- ✅ Mock server actions at module level
- ✅ Clear test names: "user does X and sees Y"

---

## Server Actions Structure

### File Organization

**Split large action files into focused modules:**

```
feature-actions/
├── actions.ts              # Barrel file (re-exports)
├── validation.ts           # Zod schemas + derived types
├── utils.ts                # Shared utilities
├── feature-crud.ts         # CRUD operations
├── feature-crud.test.ts    # CRUD tests (colocated)
├── feature-publishing.ts   # Complex operations
└── feature-publishing.test.ts
```

### Validation File Pattern

**Single source of truth for schemas and types:**

```typescript
// validation.ts
import { z } from "zod";

// Base schemas
const uuidSchema = z.string().uuid();
const requiredStringSchema = z.string().trim().min(1);

// Input schemas
export const createFeatureInputSchema = z.object({
  name: requiredStringSchema,
  description: z.string().optional(),
  status: z.enum(["draft", "published"]),
});

export const updateFeatureInputSchema = createFeatureInputSchema.partial();

// Internal validation (with IDs)
export const createFeatureSchema = z.object({
  userId: uuidSchema,
  ...createFeatureInputSchema.shape,
});

// Derive types (NEVER manually define these)
export type CreateFeatureInput = z.infer<typeof createFeatureInputSchema>;
export type UpdateFeatureInput = z.infer<typeof updateFeatureInputSchema>;
```

### Action File Pattern

**Each action file should have:**

1. **Dependency injection types** (for testing)
2. **Default dependencies** (for production)
3. **Action function(s)**

```typescript
// feature-crud.ts
"use server";

import { db } from "@/lib/db";
import { makeFeatureRepo, type Feature } from "./feature.repo";
import type { Result } from "@/lib/result";
import { type CreateFeatureInput, createFeatureSchema } from "./validation";

// 1. Dependency injection (for testing)
export type FeatureDeps = {
  repo: ReturnType<typeof makeFeatureRepo>;
  db: typeof db | any;
  now: () => Date;
};

// 2. Default dependencies (production)
const defaultDeps: FeatureDeps = {
  repo: makeFeatureRepo(),
  db: db,
  now: () => new Date(),
};

// 3. Action function
export async function createFeature(
  userId: string,
  input: CreateFeatureInput,
  deps: FeatureDeps = defaultDeps,
): Promise<Result<Feature>> {
  const { repo } = deps;

  // Validate
  const validation = createFeatureSchema.safeParse({ userId, ...input });
  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    const feature = await repo.create(validation.data);
    return { success: true, data: feature };
  } catch (error) {
    console.error("Error creating feature:", error);
    return { success: false, error: "Failed to create feature" };
  }
}
```

### Barrel File Pattern

**Re-export everything for clean imports:**

```typescript
// actions.ts
"use server";

/**
 * Feature Actions - Barrel File
 *
 * Module structure:
 * - validation.ts - Zod schemas and derived types
 * - feature-crud.ts - CRUD operations
 * - feature-publishing.ts - Publishing logic
 */

// Re-export shared types
export type { Result } from "@/lib/result";

// Re-export input types (from validation - single source of truth)
export type { CreateFeatureInput, UpdateFeatureInput } from "./validation";

// Re-export dependency types (for testing)
export type { FeatureDeps } from "./feature-crud";

// Re-export functions
export { getFeature, createFeature, deleteFeature } from "./feature-crud";
export { publishFeature } from "./feature-publishing";
```

### Action Test Pattern

**Use PGlite for integration tests:**

```typescript
// feature-crud.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createFeature } from "./feature-crud";
import { makeFeatureRepo } from "./feature.repo";

describe("createFeature - Integration Tests", () => {
  let testDb: any;

  beforeEach(async () => {
    // Fresh in-memory database for each test
    const client = new PGlite();
    testDb = drizzle(client);
    await migrate(testDb, { migrationsFolder: "./drizzle" });
  });

  it("creates feature with valid data", async () => {
    // Arrange
    const deps = {
      repo: makeFeatureRepo({ db: testDb }),
      db: testDb,
      now: () => new Date("2025-01-01"),
    };

    // Act
    const result = await createFeature(
      "user-123",
      { name: "Test Feature", status: "draft" },
      deps
    );

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Test Feature");
      expect(result.data.status).toBe("draft");
    }
  });

  it("returns error for invalid data", async () => {
    const deps = {
      repo: makeFeatureRepo({ db: testDb }),
      db: testDb,
      now: () => new Date(),
    };

    const result = await createFeature(
      "invalid-uuid",
      { name: "", status: "draft" } as any,
      deps
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid data");
    }
  });
});
```

---

## API Routes Structure

### File Organization

**Separate route handlers from business logic:**

```
api/features/
├── route.ts                    # Route handler (thin)
├── route.unit.test.ts          # Route handler tests
├── features.service.ts         # Business logic (testable)
├── features.service.unit.test.ts
├── features.repo.ts            # Database access
└── features.repo.test.ts       # Integration tests with PGlite
```

### Route Handler Pattern

**Route handlers should be thin - delegate to services:**

```typescript
// route.ts
import { NextRequest, NextResponse } from "next/server";
import { getFeatures, createFeature } from "./features.service";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getFeatures(userId);

  if (result.success) {
    return NextResponse.json(result.data);
  } else {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const result = await createFeature(userId, body);

  if (result.success) {
    return NextResponse.json(result.data, { status: 201 });
  } else {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
}
```

### Service Pattern

**Services contain business logic and are easily testable:**

```typescript
// features.service.ts
import type { Result } from "@/lib/result";
import { makeFeatureRepo, type Feature } from "./features.repo";
import { db } from "@/lib/db";

// Dependency injection
export type FeatureServiceDeps = {
  repo: ReturnType<typeof makeFeatureRepo>;
};

const defaultDeps: FeatureServiceDeps = {
  repo: makeFeatureRepo({ db }),
};

export async function getFeatures(
  userId: string,
  deps: FeatureServiceDeps = defaultDeps,
): Promise<Result<Feature[]>> {
  try {
    const features = await deps.repo.findByUserId(userId);
    return { success: true, data: features };
  } catch (error) {
    console.error("Error fetching features:", error);
    return { success: false, error: "Failed to fetch features" };
  }
}

export async function createFeature(
  userId: string,
  input: CreateFeatureInput,
  deps: FeatureServiceDeps = defaultDeps,
): Promise<Result<Feature>> {
  // Validation
  const validation = createFeatureSchema.safeParse({ userId, ...input });
  if (!validation.success) {
    return { success: false, error: "Invalid input" };
  }

  try {
    const feature = await deps.repo.create(validation.data);
    return { success: true, data: feature };
  } catch (error) {
    console.error("Error creating feature:", error);
    return { success: false, error: "Failed to create feature" };
  }
}
```

### Repository Pattern

**Repositories encapsulate database access:**

```typescript
// features.repo.ts
import { db as defaultDb } from "@/lib/db";
import { features } from "@/lib/db/schema";
import type { InferSelectModel } from "drizzle-orm";
import { eq } from "drizzle-orm";

export type Feature = InferSelectModel<typeof features>;

export function makeFeatureRepo({ db = defaultDb }: { db?: typeof defaultDb | any } = {}) {
  return {
    async findByUserId(userId: string): Promise<Feature[]> {
      return db
        .select()
        .from(features)
        .where(eq(features.userId, userId));
    },

    async create(data: NewFeature): Promise<Feature> {
      const [feature] = await db
        .insert(features)
        .values(data)
        .returning();
      return feature;
    },
  };
}
```

### API Route Test Pattern

**Unit test the route handler (mock service):**

```typescript
// route.unit.test.ts
import { describe, it, expect, vi } from "vitest";
import { GET, POST } from "./route";
import * as service from "./features.service";

vi.mock("./features.service");

describe("GET /api/features", () => {
  it("returns features for authenticated user", async () => {
    // Arrange
    vi.mocked(service.getFeatures).mockResolvedValue({
      success: true,
      data: [{ id: "1", name: "Feature 1" }],
    });

    const req = new Request("http://localhost/api/features", {
      headers: { "x-user-id": "user-123" },
    });

    // Act
    const response = await GET(req as any);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data).toEqual([{ id: "1", name: "Feature 1" }]);
    expect(service.getFeatures).toHaveBeenCalledWith("user-123");
  });

  it("returns 401 when not authenticated", async () => {
    const req = new Request("http://localhost/api/features");
    const response = await GET(req as any);

    expect(response.status).toBe(401);
  });
});
```

**Integration test the service (with PGlite):**

```typescript
// features.service.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { createFeature } from "./features.service";
import { makeFeatureRepo } from "./features.repo";

describe("createFeature - Service Integration", () => {
  let testDb: any;

  beforeEach(async () => {
    const client = new PGlite();
    testDb = drizzle(client);
    // Run migrations
  });

  it("creates feature and returns it", async () => {
    const deps = { repo: makeFeatureRepo({ db: testDb }) };

    const result = await createFeature(
      "user-123",
      { name: "Test", status: "draft" },
      deps
    );

    expect(result.success).toBe(true);
  });
});
```

---

## Testing Standards

### Test File Naming

**Colocate tests with source files:**

```
✅ feature-card.tsx
✅ feature-card.test.tsx         # Component test

✅ feature-crud.ts
✅ feature-crud.test.ts          # Integration test

✅ route.ts
✅ route.unit.test.ts            # Unit test (mocked)

✅ features.service.ts
✅ features.service.unit.test.ts # Unit test (mocked)
✅ features.service.test.ts      # Integration test (PGlite)
```

### Test Types

| Test Type | File Suffix | What to Test | How to Test |
|-----------|-------------|--------------|-------------|
| **Unit** | `.unit.test.ts` | Route handlers, isolated functions | Mock dependencies |
| **Integration** | `.test.ts` | Services, repositories, server actions | PGlite in-memory DB |
| **Component** | `.test.tsx` | UI components | Testing Library + mock actions |

### Test Structure (AAA Pattern)

**Arrange, Act, Assert:**

```typescript
it("user updates feature successfully", async () => {
  // Arrange - Set up test data and mocks
  const deps = { repo: makeFeatureRepo({ db: testDb }) };
  const feature = await createTestFeature(testDb);

  // Act - Perform the operation
  const result = await updateFeature(feature.id, { status: "published" }, deps);

  // Assert - Verify the outcome
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.status).toBe("published");
  }
});
```

### What to Test

✅ **DO test:**
- User-visible behavior
- Error handling
- Edge cases (empty states, boundaries)
- Integration between layers

❌ **DON'T test:**
- Implementation details
- Third-party libraries (Zod, Drizzle)
- Type definitions

---

## Code Review Checklist

Use this checklist before submitting code:

### Types & Schemas
- [ ] Types derived from Zod schemas using `z.infer`
- [ ] No duplicate type definitions
- [ ] Database types use `InferSelectModel` from Drizzle
- [ ] Used `Pick`/`Omit` instead of redefining subset types

### File Organization
- [ ] Code organized by feature, not by type
- [ ] Tests colocated with source files
- [ ] Large files (>200 lines) split into focused modules
- [ ] Barrel files (`actions.ts`) only re-export, no logic

### Components
- [ ] Client components have `"use client"` directive
- [ ] Server actions mocked in component tests
- [ ] Tests use `getByRole` over `getByTestId`
- [ ] Test names describe user behavior

### Server Actions
- [ ] Dependency injection for testability
- [ ] Result type for error handling (no throwing)
- [ ] Validation with Zod schemas
- [ ] Integration tests with PGlite

### API Routes
- [ ] Route handlers are thin (delegate to services)
- [ ] Business logic in services (testable)
- [ ] Database access in repositories
- [ ] Both unit tests (mocked) and integration tests (PGlite)

### DRY Violations
- [ ] No code duplication across files
- [ ] Shared utilities in `lib/`
- [ ] Common types in `lib/` or feature root
- [ ] Repeated logic extracted to functions

### Single Responsibility
- [ ] Each file has one clear purpose
- [ ] Functions do one thing
- [ ] Components render one concern
- [ ] No god objects or mega files

---

## Anti-Patterns to Avoid

### ❌ Type-Based Folders
```
src/
├── components/     # All components together
├── actions/        # All actions together
├── types/          # All types together
```

### ❌ Manual Type Definitions
```typescript
const schema = z.object({ name: z.string() });
type Data = { name: string };  // Duplicate!
```

### ❌ Fat Barrel Files
```typescript
// actions.ts (500 lines)
export async function createUser() { /* 100 lines */ }
export async function updateUser() { /* 100 lines */ }
export async function deleteUser() { /* 100 lines */ }
```

### ❌ Untestable Code
```typescript
export async function createUser(input: UserInput) {
  const db = getDatabase();  // Hard-coded dependency!
  return db.insert(users).values(input);
}
```

### ❌ Throwing Instead of Result Types
```typescript
export async function getUser(id: string): Promise<User> {
  const user = await db.findById(id);
  if (!user) throw new Error("Not found");  // Forces try/catch everywhere
  return user;
}
```

---

## Migration Guide

### Refactoring Existing Code

When you encounter code that violates these standards:

1. **Add tests first** (if missing)
2. **Extract duplicates** to shared locations
3. **Split large files** into focused modules
4. **Derive types** from schemas (delete manual definitions)
5. **Colocate** related files
6. **Run tests** to verify nothing broke

### Example Migration

**Before:**
```
src/
├── components/UserProfile.tsx
├── actions/user-actions.ts (500 lines)
├── types/user-types.ts
└── tests/UserProfile.test.tsx
```

**After:**
```
src/app/(dashboard)/users/[id]/
├── _components/
│   ├── user-profile.tsx
│   └── user-profile.test.tsx
└── user-actions/
    ├── actions.ts (barrel)
    ├── validation.ts (schemas + types)
    ├── user-crud.ts
    ├── user-crud.test.ts
    ├── user-publishing.ts
    └── user-publishing.test.ts
```

---

## Examples in Codebase

**Good Examples to Follow:**

1. **Result Type** - `src/lib/result.ts`
   - Single source of truth for Result type
   - Used across entire app

2. **Routine Actions** - `src/app/(dashboard)/subscribers/[id]/routine-info-actions/`
   - Feature-based organization
   - Types derived from schemas
   - Focused modules (<400 lines each)
   - Dependency injection for testing

3. **Should Generate** - `src/lib/__tests__/shouldGenerateForDate.test.ts`
   - Colocated with source
   - Clear test names
   - AAA pattern

**Bad Examples to Avoid:**

1. **11 duplicate Result type definitions** (before refactor)
2. **955-line actions.ts** (before split)
3. **Manual type definitions** that duplicate Zod schemas

---

## Questions?

If you're unsure whether code follows these standards, ask:

1. **Is this duplicated elsewhere?** → Extract to shared location
2. **Does this file do multiple things?** → Split into focused modules
3. **Are types manually defined?** → Derive from schemas
4. **Is business logic in route handlers?** → Move to services
5. **Can I test this easily?** → Add dependency injection

When in doubt, follow the examples in this document.
