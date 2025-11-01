# Clean Code Quick Reference

Quick checklist for writing clean code. See [CLEAN_CODE_ARCHITECTURE.md](./CLEAN_CODE_ARCHITECTURE.md) for full details.

## Before You Code

- [ ] Is this feature already implemented elsewhere? (DRY)
- [ ] Where should this code live? (Feature-based colocation)
- [ ] What types can I derive instead of manually defining?

## Type System

### ✅ DO
```typescript
// Derive from schema
const schema = z.object({ name: z.string() });
type Data = z.infer<typeof schema>;

// Use Pick/Omit
type UserPublic = Omit<User, "password">;

// Use Drizzle types
type UserRow = InferSelectModel<typeof users>;

// Import from shared lib
import type { Result } from "@/lib/result";
```

### ❌ DON'T
```typescript
// Manual duplicate
const schema = z.object({ name: z.string() });
type Data = { name: string };  // ❌

// Redefine fields
type UserPublic = { id: string; name: string };  // ❌

// Manual DB type
type UserRow = { id: string; name: string };  // ❌

// Duplicate Result type
type Result<T> = { success: true; data: T } | ...  // ❌
```

## File Organization

### ✅ Feature-Based
```
feature/
├── page.tsx
├── _components/
│   ├── feature-card.tsx
│   └── feature-card.test.tsx  ← Colocated
└── feature-actions/
    ├── actions.ts             ← Barrel
    ├── validation.ts          ← Schemas + types
    ├── feature-crud.ts
    └── feature-crud.test.ts   ← Colocated
```

### ❌ Type-Based
```
src/
├── components/     ← ❌
├── actions/        ← ❌
├── types/          ← ❌
└── tests/          ← ❌
```

## Server Actions

### File Structure
```typescript
// validation.ts - Single source of truth
export const createSchema = z.object({ name: z.string() });
export type CreateInput = z.infer<typeof createSchema>;

// feature-crud.ts - Focused module
export type FeatureDeps = { repo, db, now };
const defaultDeps = { ... };

export async function create(
  input: CreateInput,
  deps = defaultDeps
): Promise<Result<Feature>> {
  // Implementation
}

// actions.ts - Barrel (re-exports only)
export type { CreateInput } from "./validation";
export type { FeatureDeps } from "./feature-crud";
export { create } from "./feature-crud";
```

### Size Limits
- Single function: **< 50 lines**
- Module file: **< 400 lines**
- If larger: **split into focused files**

## Components

```typescript
// ✅ Component structure
"use client";

import { useTransition } from "react";
import { updateFeature } from "../actions";

type Props = { feature: Feature };

export function FeatureCard({ feature }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleUpdate = () => {
    startTransition(async () => {
      const result = await updateFeature(feature.id);
      // Handle result
    });
  };

  return <div>{/* UI */}</div>;
}

// ✅ Test (colocated)
// feature-card.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { FeatureCard } from "./feature-card";

vi.mock("../actions", () => ({
  updateFeature: vi.fn(),
}));

it("user updates feature successfully", async () => {
  // Arrange, Act, Assert
});
```

## API Routes

### Route Handler (Thin)
```typescript
// route.ts
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getFeatures(userId);  // Delegate to service
  return result.success
    ? NextResponse.json(result.data)
    : NextResponse.json({ error: result.error }, { status: 400 });
}
```

### Service (Business Logic)
```typescript
// features.service.ts
export async function getFeatures(
  userId: string,
  deps = defaultDeps
): Promise<Result<Feature[]>> {
  try {
    const features = await deps.repo.findByUserId(userId);
    return { success: true, data: features };
  } catch (error) {
    return { success: false, error: "Failed to fetch" };
  }
}
```

### Repository (DB Access)
```typescript
// features.repo.ts
export function makeFeatureRepo({ db = defaultDb } = {}) {
  return {
    async findByUserId(userId: string) {
      return db.select().from(features).where(eq(features.userId, userId));
    },
  };
}
```

## Testing

### Test Types
| Type | File | Mock? | DB? |
|------|------|-------|-----|
| Unit | `.unit.test.ts` | ✅ Yes | ❌ Mock |
| Integration | `.test.ts` | ❌ No | ✅ PGlite |
| Component | `.test.tsx` | ✅ Actions | ❌ N/A |

### Test Structure (AAA)
```typescript
it("user does X and sees Y", async () => {
  // Arrange - Setup
  const deps = { repo: makeRepo({ db: testDb }) };

  // Act - Execute
  const result = await doSomething(input, deps);

  // Assert - Verify
  expect(result.success).toBe(true);
});
```

## Common Violations

### 🚨 STOP if you see:
- ❌ Duplicate type definitions
- ❌ File > 400 lines
- ❌ Manual types that match schemas
- ❌ Business logic in route handlers
- ❌ Code duplicated across files
- ❌ Tests in separate folders
- ❌ `throw new Error` instead of Result type

### ✅ DO instead:
- ✅ Use `z.infer` to derive types
- ✅ Split into focused modules
- ✅ Move logic to services
- ✅ Extract shared code
- ✅ Colocate tests
- ✅ Return `Result<T>`

## Code Review Checklist

**Before submitting:**
- [ ] No duplicate types (use `z.infer`, `Pick`, `Omit`)
- [ ] Tests colocated with source
- [ ] Files < 400 lines (split if larger)
- [ ] Feature-based organization
- [ ] Result type for errors (no throwing)
- [ ] Dependency injection for testing

## Quick Wins

**10-Minute Improvements:**
1. Colocate a test file with its source
2. Derive one type from a Zod schema
3. Extract duplicated code to a function
4. Split a >400 line file into 2 focused files
5. Add dependency injection to an untestable function

## Examples in Codebase

**✅ Good:**
- `src/lib/result.ts` - Shared Result type
- `src/app/(dashboard)/subscribers/[id]/routine-info-actions/` - Feature organization
- `src/lib/__tests__/shouldGenerateForDate.test.ts` - Colocated test

**❌ Before Refactor (Don't Copy):**
- 955-line actions.ts (now split)
- 11 duplicate Result type definitions (now shared)

---

**Full Guide:** [CLEAN_CODE_ARCHITECTURE.md](./CLEAN_CODE_ARCHITECTURE.md)
