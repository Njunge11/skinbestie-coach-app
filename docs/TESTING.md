# Testing Guide

## Table of Contents
1. Testing philosophy
2. What is a unit test vs integration test
3. Core rules
4. Test structure
5. Test doubles (stub / fake / mock)
6. Type management strategy (InferSelectModel + Pick/Omit)
7. Testing patterns in this project
    * Repository tests (integration tests with PGlite)
    * Service/action tests (unit tests with fake repos)
8. Externals: do this, not that
    * Database
    * HTTP
    * Filesystem
    * Clock / Time
    * Randomness / IDs
8. Routes/controllers: unit vs integration
9. Smells (fix these)
10. Refactors vs. breaking changes (contracts) — data-structure caveat
11. Checklists
12. Litmus test

## Testing philosophy

**Increase test fidelity by using real implementations as fakes where possible.**

This project follows Google's testing guidance: prefer real implementations (like PGlite for Postgres) over mocks to increase test fidelity and catch real bugs. See: [Google Testing Blog - Increase Test Fidelity by Avoiding Mocks](https://testing.googleblog.com/2024/02/increase-test-fidelity-by-avoiding-mocks.html)

## What is a unit test vs integration test

### Unit Test
* Tests one small piece (function/module) through its public API
* Dependencies are mocked/stubbed (not real implementations)
* Fast, isolated, deterministic
* **Example:** Service layer tests with mocked repositories

### Integration Test
* Tests multiple components working together
* Uses real implementations where possible (e.g., PGlite for database)
* Slower but higher fidelity - catches real integration bugs
* **Example:** Repository tests with PGlite database

**Both types are valuable** - unit tests for business logic isolation, integration tests for verifying components work together correctly.

## Core rules
* Test WHAT, not HOW. Assert result/state/event/error; don't assert private helpers or internal call order. (Google: "Test state, not interactions.")
* One behavior per test. (one Given/When/Then) (Google: "Test behaviors, not methods.")
* Use the front door. Call the unit's exported function (public API), not internals. (Google: "Test via public APIs.")
* Deterministic. Same inputs → same outputs every run (control time and IDs/random). (Google: reliability/maintainability.)
* Name by behavior. e.g., create_withNewEmail_setsDefaultRole. (Google: descriptive test names.)
* Clear messages. Assertions should show expected vs actual clearly. (Google: write clear failure messages.)
* Prefer DAMP over DRY for tests. Small duplication is OK to keep tests descriptive and self-contained. (Google: "DAMP, not DRY.")

## Test structure
```
Given   (inputs + stand-ins)
When    (call the public API)
Then    (assert result / state / event / error)
```

## Test doubles (stub / fake / mock)
* **Stub** → returns a pre-set answer. No memory, no rules. Use when you just need a value back.
* **Fake** → working implementation optimized for testing (e.g., PGlite for Postgres, Map for repository). Provides real behavior without production dependencies.
* **Mock** → verify that a specific external call happened. Use only when the external call is the requirement (e.g., "send one email"). (Google: interaction checks only when the interaction is the contract.)

**Chooser:** value → Stub; working implementation → Fake; must prove external call → Mock.

**Prefer fakes over mocks** for higher test fidelity. A fake (like PGlite) behaves like the real thing and catches real bugs that mocks miss.

## Type management strategy (InferSelectModel + Pick/Omit)

**Problem:** Adding optional fields to the database schema breaks tests and components that don't even use those fields.

**Solution:** Use Drizzle's `InferSelectModel` as the single source of truth, then derive component-specific types using `Pick` and `Omit`.

### Pattern

```typescript
// src/lib/db/types.ts
import { type InferSelectModel } from "drizzle-orm";
import { userProfiles } from "./schema";

// 1. Base row type (tracks schema changes automatically)
export type UserProfileRow = InferSelectModel<typeof userProfiles>;

// 2. Component-specific view models (only fields needed)
export type UserProfileCard = Pick<UserProfileRow, "id" | "firstName" | "lastName" | "email">;
export type SubscriberTableRow = Pick<UserProfileRow, "id" | "email" | "isCompleted">;
export type ProfileFormData = Omit<UserProfileRow, "id" | "createdAt" | "updatedAt">;
```

### Test Factories

Use factories that provide defaults for ALL fields:

```typescript
// src/test/factories.ts
import { type UserProfileRow } from "@/lib/db/types";

export function makeUserProfile(
  overrides: Partial<UserProfileRow> = {}
): UserProfileRow {
  return {
    id: crypto.randomUUID(),
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    nickname: null, // ← Add new fields here once
    // ... all other fields with defaults
    ...overrides,
  };
}

// In tests:
const user = makeUserProfile({ firstName: "Jane" });
// All fields including 'nickname' are automatically included
```

### Benefits

✅ **Schema changes don't break unrelated code** - Adding `nickname` to the schema only requires updating:
  - The factory (once)
  - Components that actually display nickname

✅ **Compile-time safety** - TypeScript catches when you use a field that doesn't exist

✅ **Components get exactly what they need** - No over-fetching or unnecessary dependencies

✅ **No manual type duplication** - Types derive from schema automatically

### Migration Path

When adding a new field:

1. Add to schema
2. Run migration
3. Add to factory with default value
4. Add to view models that need it (using Pick)
5. Tests continue working!

## Testing patterns in this project

This project uses **two testing patterns** depending on what you're testing:

### Pattern 1: Repository tests (Integration tests with PGlite)

**Use PGlite when testing repositories** that contain complex queries or business logic:
- Complex JOINs across multiple tables
- Business logic in SQL (filtering, mapping, ordering)
- Custom SQL expressions

```typescript
// dashboard.repo.unit.test.ts
import { createTestDatabase, cleanupTestDatabase, type TestDatabase } from '@/test/db-helper';
import { makeDashboardRepo } from './dashboard.repo';
import * as schema from '@/lib/db/schema';
import type { PGlite } from '@electric-sql/pglite';

describe('DashboardRepo', () => {
  let db: TestDatabase;
  let client: PGlite;
  let repo: ReturnType<typeof makeDashboardRepo>;

  beforeEach(async () => {
    // Create fresh in-memory database for each test
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;
    repo = makeDashboardRepo({ db });

    // Seed test data
    await db.insert(schema.userProfiles).values({...});
  });

  afterEach(async () => {
    await cleanupTestDatabase(client);
  });

  it('returns user with joined goals and routine data', async () => {
    // Test complex JOINs work correctly
    const result = await repo.getUserDashboardData('user-123');
    expect(result.goalsTemplateStatus).toBe('published');
  });
});
```

**Why PGlite?**
- ✅ Real Postgres behavior (catches SQL bugs that mocks miss)
- ✅ Fast (in-memory, no Docker)
- ✅ Tests your SQL queries, not just business logic
- ✅ Higher test fidelity than Map-based fakes

### Pattern 2: Service/action tests (Unit tests with mocked repos)

**Use mocked repositories when testing services/actions** that contain business logic:

```typescript
// dashboard.service.unit.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeDashboardService, type DashboardServiceDeps } from './dashboard.service';

describe('DashboardService', () => {
  let service: ReturnType<typeof makeDashboardService>;
  let mockRepo: {
    getUserDashboardData: ReturnType<typeof vi.fn>;
    getPublishedGoals: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepo = {
      getUserDashboardData: vi.fn(),
      getPublishedGoals: vi.fn(),
    };

    service = makeDashboardService({ repo: mockRepo });
  });

  it('calculates setup progress correctly', async () => {
    // Mock repository responses
    mockRepo.getUserDashboardData.mockResolvedValue({
      hasCompletedSkinTest: true,
      hasCompletedBooking: true,
      goalsTemplateStatus: 'published',
      routineStatus: 'published',
    });
    mockRepo.getPublishedGoals.mockResolvedValue([]);

    const result = await service.getConsumerDashboard('user-123');

    expect(result.data.setupProgress.percentage).toBe(100);
  });
});
```

**Why mocked repos?**
- ✅ Isolates business logic
- ✅ Faster than database tests
- ✅ Tests service layer independently
- ✅ Easy to test edge cases

### When to use which pattern

| What you're testing | Pattern | Tool |
|-------------------|---------|------|
| Repository with complex JOINs | Integration test | PGlite |
| Repository with SQL business logic | Integration test | PGlite |
| Service/action business logic | Unit test | Mocked repo (vi.fn) |
| API route handler | Unit test | Mocked service |
| Utility functions | Unit test | Direct calls |

## Externals: do this, not that

### Database
**Real (production):** Postgres/MySQL/Mongo/Redis connecting to actual servers.

**Integration tests (repositories):** PGlite in-memory database for real PostgreSQL behavior without a server.

**Unit tests (services/actions):** Mock the repository layer with vi.fn().

```typescript
// test-db-helper.ts
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/lib/db/schema';

export async function createTestDatabase() {
  // Create in-memory PgLite instance
  const client = new PGlite('memory://');
  const db = drizzle(client, { schema });

  // Apply schema (for tests, push is faster than migrations)
  await applyTestSchema(client);

  return { db, client };
}

// For test isolation - clone a base database
export async function cloneTestDatabase(baseClient: PGlite) {
  const client = await baseClient.clone();
  const db = drizzle(client, { schema });
  return { db, client };
}

// admin.service.ts (with dependency injection)
export function makeAdminService(deps: { db: any }) {
  return {
    async create(dto: { email: string; name: string }) {
      const existing = await deps.db
        .select()
        .from(admins)
        .where(eq(admins.email, dto.email))
        .limit(1);

      if (existing.length > 0) throw new Error("duplicate");

      const [admin] = await deps.db
        .insert(admins)
        .values({ ...dto, role: "ADMIN" })
        .returning();

      return admin;
    }
  };
}

// admin.service.unit.test.ts
import { createTestDatabase } from '@/test/db-helper';

describe('AdminService', () => {
  let db: any;
  let client: PGlite;

  beforeEach(async () => {
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;
  });

  afterEach(async () => {
    await client.close();
  });

  it("creates admin with default role", async () => {
    const svc = makeAdminService({ db });

    const admin = await svc.create({ email: "a@b.com", name: "Ada" });

    expect(admin).toMatchObject({ email: "a@b.com", name: "Ada", role: "ADMIN" });

    // Verify in database
    const found = await db
      .select()
      .from(admins)
      .where(eq(admins.email, "a@b.com"));
    expect(found).toHaveLength(1);
  });
});
```

### HTTP
**Real (not in unit tests):** starting a server; hitting real endpoints; calling real third-party APIs with fetch/Axios.

**Unit test:**
* Clients: stub the HTTP client to return fixed data.
* Handlers: call the handler function directly with fake req/res (no server).

```typescript
// email.client.ts
export function makeEmailClient(http: { post: (url: string, data: any) => Promise<any> }) {
  return {
    async sendPasswordReset(email: string, token: string) {
      const r = await http.post('/send', { to: email, template: 'reset', token });
      return r.data.messageId as string;
    }
  };
}

// email.client.unit.test.ts
it("returns message ID from API", async () => {
  const httpStub = { post: async (_: string, __: any) => ({ data: { messageId: "msg_123" } }) };
  const client = makeEmailClient(httpStub);
  expect(await client.sendPasswordReset("test@example.com", "token123")).toBe("msg_123");
});

// createAdmin.handler.ts (no server)
export function makeCreateAdminHandler(deps: { create: (b: any) => Promise<any> }) {
  return async (req: any, res: any) => {
    const admin = await deps.create(req.body);
    res.status(201).json({ id: admin.email, email: admin.email });
  };
}

// createAdmin.handler.unit.test.ts
it("returns 201 with created admin", async () => {
  const req = { body: { email: "a@b.com", name: "Ada" } } as any;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

  const svc = makeAdminService({ repo: makeAdminsRepoFake() });
  const handler = makeCreateAdminHandler({ create: svc.create });

  await handler(req, res);

  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ email: "a@b.com" }));
});
```

### Filesystem
**Real (not in unit tests):** reading/writing actual files/dirs (fs.readFile, fs.writeFile, etc.).

**Unit test:** use an in-memory fake FS or stubs.

```typescript
// file.storage.fake.ts
export function makeFsFake() {
  const files = new Map<string, Buffer>();
  return {
    write(path: string, content: Buffer) { files.set(path, content); return Promise.resolve(); },
    read(path: string) { return Promise.resolve(files.get(path) ?? null); }
  };
}

// profilePhoto.service.ts
export function makeProfilePhotoService(storage: ReturnType<typeof makeFsFake>) {
  return {
    async upload(userId: string, content: Buffer) {
      await storage.write(`photos/${userId}.jpg`, content);
    }
  };
}

// profilePhoto.service.unit.test.ts
it("stores profile photo and can read it back", async () => {
  const storage = makeFsFake();
  const svc = makeProfilePhotoService(storage);

  await svc.upload("user_1", Buffer.from("img"));
  const buf = await storage.read("photos/user_1.jpg");

  expect(buf?.length).toBeGreaterThan(0);
});
```

### Clock / Time
**Real (not in unit tests):** Date.now(), new Date() (changes every run).

**Unit test:** inject a clock; pass a fixed timestamp.

```typescript
// token.util.ts
export function expiresAt(minutes: number, clock = () => Date.now()) {
  return new Date(clock() + minutes * 60_000);
}

// token.util.unit.test.ts
it("computes expiry from fixed 'now'", () => {
  const fixedNow = () => Date.UTC(2025, 0, 1, 12, 0, 0);
  const expiry = expiresAt(15, fixedNow);
  expect(expiry.toISOString()).toBe("2025-01-01T12:15:00.000Z");
});
```

### Randomness / IDs
**Real (not in unit tests):** Math.random(), crypto.randomUUID(), uuid.v4() (values change each run).

**Unit test:** inject generators; stub to a fixed value (or use a seeded RNG).

```typescript
// order.util.ts
export function newOrderId(gen = { uuid: crypto.randomUUID }) {
  return `ord_${gen.uuid()}`;
}

// order.util.unit.test.ts
it("prefixes generated id", () => {
  const fixedGen = { uuid: () => "00000000-0000-0000-0000-000000000000" };
  const id = newOrderId(fixedGen);
  expect(id).toBe("ord_00000000-0000-0000-0000-000000000000");
});
```

### Validation Functions
**Real (not in unit tests):** Regex validation, format checks (strict UUID/email/phone validation).

**Unit test:** inject validation function; stub to control test scenarios.

```typescript
// Validation helper (reusable)
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// user.service.ts
export type UserDeps = {
  db: any;
  validateId?: (id: string) => boolean; // Optional, defaults to UUID validation
};

export async function getUser(userId: string, deps: UserDeps) {
  const { db, validateId = isValidUUID } = deps;

  if (!validateId(userId)) {
    return { success: false, error: "Invalid user ID" };
  }

  const user = await db.getById(userId);
  return { success: true, data: user };
}

// user.service.unit.test.ts
it("accepts any ID format in tests", async () => {
  const fakeDb = { getById: async () => ({ id: "user_1", name: "Alice" }) };
  const deps = {
    db: fakeDb,
    validateId: () => true // Accept any ID in tests
  };

  const result = await getUser("user_1", deps);
  expect(result.success).toBe(true);
});

it("rejects invalid ID", async () => {
  const fakeDb = { getById: async () => null };
  const deps = {
    db: fakeDb,
    validateId: () => false // Simulate validation failure
  };

  const result = await getUser("bad-id", deps);
  expect(result.success).toBe(false);
  expect(result.error).toBe("Invalid user ID");
});

// Production code uses real UUID validation
const prodDeps = { db: realDb, validateId: isValidUUID };
```

**Why?** This lets tests use simple IDs like `"user_1"` instead of UUIDs, while production validates strictly.

## Routes/controllers: unit vs integration
* **Unit (handler only):** Call the handler function directly with fake req/res and mocked services. Do not start a server. Do not use a real DB.
* **Integration:** Start the app with supertest (future work). Not currently implemented in this project.

**This project uses:**
- Integration tests for repositories (PGlite)
- Unit tests for services, actions, and handlers (mocked dependencies)

## Smells (fix these)

### 1) Hidden setup that obscures behavior
**Bad:** key inputs live in a far-away fixture or beforeEach, so the test is unreadable.
```typescript
// beforeEach elsewhere:
defaults = { email: "a@b.com", name: "Ada" };

it("creates admin", async () => {
  const admin = await svc.create(defaults); // where did values come from?
  expect(admin.email).toBe("a@b.com");
});
```

**Good:** put key inputs in the test body (explicit Given).
```typescript
it("creates admin", async () => {
  const input = { email: "a@b.com", name: "Ada" }; // visible here
  const admin = await svc.create(input);
  expect(admin.email).toBe("a@b.com");
});
```

### 2) Checking internals instead of outcomes
**Bad:** verifying private calls or order.
```typescript
expect(internalSaveSpy).toHaveBeenCalledTimes(1);
```

**Good:** verify the observable result/state.
```typescript
expect(await repo.getByEmail("a@b.com")).toBeDefined();
```

### 3) Logic in tests (ifs/loops/calculations)
**Bad:** computing expected values inside the test.
```typescript
const expected = ["A","B","C"].sort();
expect(actual).toEqual(expected);
```

**Good:** write the expected literal.
```typescript
expect(actual).toEqual(["A","B","C"]);
```

### 4) Real externals in unit tests
**Bad:** real DB/HTTP/FS/time/random.
```typescript
await db.query("INSERT ...");
await fetch("https://api.example.com");
const now = Date.now();
const id = crypto.randomUUID();
```

**Good:** use fakes/stubs and fixed time/IDs.
```typescript
const repo = makeAdminsRepoFake();
const fixedNow = () => 1_725_000_000_000;
const idGen = { uuid: () => "00000000-0000-0000-0000-000000000000" };
```

### 5) Multiple behaviors in one test
**Bad:** two scenarios in one test.
```typescript
it("creates admin and rejects duplicate", async () => { /* ...two flows... */ });
```

**Good:** split into two tests (one behavior each).

### 6) Asserting order when order isn't promised
**Bad:** strict order when the API doesn't guarantee it.
```typescript
expect(result.map(x => x.name)).toEqual(["Algeria","Kenya","Zimbabwe"]);
```

**Good:** assert membership and count (or sort in the test).
```typescript
expect(result.map(x => x.name)).toEqual(
  expect.arrayContaining(["Algeria","Kenya","Zimbabwe"])
);
expect(result).toHaveLength(3);
// or:
expect(result.map(x => x.name).sort()).toEqual(["Algeria","Kenya","Zimbabwe"]);
```

### 7) Over-DRY tests that hide meaning
**Bad:** heavy shared helpers that hide important details.

**Good:** prefer DAMP ("Descriptive And Meaningful Phrases"): minor duplication is fine if it makes the test clear and self-contained.

## Refactors vs. breaking changes (contracts) — data-structure caveat

### Pure refactor (should NOT break unit tests)
You change internals only (e.g., Array → Map, rename private helpers), and the public contract is identical:
* same return shape (array vs object),
* same field names/types,
* same ordering guarantees (if any),
* same error behavior (what is thrown/returned),
* same edge-case rules (e.g., how duplicates are handled).

If all of the above stay the same, unit tests that assert public outcomes keep passing.

### Breaking change (WILL and SHOULD break unit tests)
Any change visible to callers:
* Return shape changes (array → object/map; item fields/types change).
* Guaranteed order changes (you promised A→Z; now it's arbitrary).
* Error contract changes (used to throw {status:404}, now {status:400} / returns null).
* Edge-case rule changes (e.g., previously allowed duplicates, now deduped).

### Common caveats when changing data structures
* **Order leaks through:** Array → Map/Set often changes iteration order. If your API promised order, preserve it (e.g., sort before returning).
* **Dedup semantics change:** Set drops duplicates; if duplicates used to exist, this breaks callers.
* **Type coercion:** object keys can blur "1" vs 1. Keep types stable.
* **Serialization:** Map doesn't JSON-serialize as intended; convert to plain arrays/objects first.
* **Null/undefined/throw:** swapping between them is a contract change.

### Concrete examples

**Safe refactor (internal Array → Map, contract preserved with A→Z ordering):**
```typescript
// Before (internal Array), contract: returns countries A→Z
export async function getCountries(repo: any) {
  const rows = await repo.all();
  return rows.map((r: any) => ({ id: r.id, name: r.name })); // already A→Z
}

// After (internal Map), SAME contract: still returns A→Z array
export async function getCountries(repo: any) {
  const byId = new Map((await repo.all()).map((r: any) => [r.id, r]));
  const rows = Array.from(byId.values())
    .sort((a, b) => a.name.localeCompare(b.name)); // preserve order promise
  return rows.map((r: any) => ({ id: r.id, name: r.name }));
}
```

**Breaking change (shape changed — don't do this unless you intend to change the contract):**
```typescript
// Before: Country[]
export async function getCountries(repo: any) { /* ... */ return [{ id, name }, /*...*/]; }

// After: { [id]: Country }  ❌ breaking (return shape changed)
export async function getCountries(repo: any) {
  const out: Record<string, any> = {};
  for (const r of await repo.all()) out[r.id] = { id: r.id, name: r.name };
  return out; // callers now get an object, not an array
}
```

### Ordering assertions
* **Order promised?** Assert exact order:
```typescript
expect(result.map(x => x.name)).toEqual(["Algeria","Kenya","Zimbabwe"]);
```

* **No order promised?** Assert membership + count (or sort in test):
```typescript
expect(result.map(x => x.name)).toEqual(
  expect.arrayContaining(["Algeria","Kenya","Zimbabwe"])
);
expect(result).toHaveLength(3);
// or
expect(result.map(x => x.name).sort()).toEqual(["Algeria","Kenya","Zimbabwe"]);
```

## Checklists

### "What type of test should I write?"

**Repository test (integration test):**
* Contains complex JOINs? → Use PGlite
* Contains SQL business logic? → Use PGlite
* Custom SQL expressions? → Use PGlite

**Service/action test (unit test):**
* Business logic above the data layer? → Mock repository
* Validation, formatting, calculations? → Mock dependencies

### "Is this a unit test?"
* Calls exported function of a small module? **Yes**
* Dependencies are mocked (not real)? **Yes**
* One behavior with Given/When/Then? **Yes**
* Deterministic (fixed time/IDs)? **Yes**
* Fast (< 100ms per test)? **Yes**

### "Is this an integration test?"
* Tests multiple components together? **Yes**
* Uses real implementations (PGlite)? **Yes**
* Tests complex interactions (JOINs, queries)? **Yes**
* Slower but higher fidelity? **Yes**

### "Stub vs Fake vs Mock?"
* Need a value → **Stub**
* Need state/rules → **Fake**
* Need to prove an external call (and that call is the promise) → **Mock**

### "Should I assert order?"
* Promised order? **Yes** (assert exact order)
* No promise? **No** (assert membership + count, or sort in test)

## Litmus test
Refactor internals (rename private helpers, change internal data structures). If tests still pass, you tested WHAT. If they break, you tested HOW (tighten tests to public behavior only).

---

# Server Actions Testing Patterns (Next.js)

This section documents the exact patterns used for testing Next.js server actions in this project. **Follow these patterns exactly to write tests that pass deterministically without errors.**

## Pattern Overview

All server actions in this project follow these conventions:
1. **Result Type Pattern** - Actions return `{ success: true; data: T } | { success: false; error: string }`
2. **Dependency Injection** - Actions accept a `deps` parameter for testability
3. **Fake Repositories** - Use in-memory Map-based repositories for tests
4. **Validation** - Use Zod schemas for input validation
5. **Error Handling** - All database operations wrapped in try-catch

## 1. Result Type Pattern

All server actions return a discriminated union:

```typescript
// Result types (copy this exactly)
type SuccessResult<T> = { success: true; data: T };
type ErrorResult = { success: false; error: string };
type Result<T> = SuccessResult<T> | ErrorResult;
```

Usage in tests:
```typescript
const result = await createGoal(userId, data, deps);

expect(result.success).toBe(true);
if (result.success) {
  expect(result.data.name).toBe("Clear skin");
}

// Or for errors:
expect(result.success).toBe(false);
if (!result.success) {
  expect(result.error).toBe("Invalid data");
}
```

## 2. Dependency Injection Pattern

Every action module exports a `Deps` type and accepts it as the last parameter:

```typescript
// In actions.ts
export type GoalDeps = {
  repo: ReturnType<typeof makeGoalsRepo>;
  now: () => Date;
};

const defaultDeps: GoalDeps = {
  repo: makeGoalsRepo(),
  now: () => new Date(),
};

export async function createGoal(
  userId: string,
  input: CreateGoalInput,
  deps: GoalDeps = defaultDeps
): Promise<Result<Goal>> {
  const { repo, now } = deps;
  // ... implementation
}
```

**Why?** This allows tests to inject fake repos and fixed timestamps.

## 3. PgLite Database Pattern for Repository Testing

Use PgLite in-memory databases for testing repositories with real PostgreSQL behavior.

### Test Database Setup

Create a shared test database helper:

```typescript
// test/db-helper.ts
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/lib/db/schema';
import type { PgliteDatabase } from 'drizzle-orm/pglite';

export type TestDatabase = PgliteDatabase<typeof schema>;

export async function createTestDatabase(): Promise<{
  db: TestDatabase;
  client: PGlite;
}> {
  // Create in-memory PgLite instance
  const client = new PGlite('memory://');

  // Create Drizzle instance with schema
  const db = drizzle(client, { schema });

  // Apply schema directly (faster than migrations for tests)
  await applyTestSchema(client);

  return { db, client };
}

// Clone for test isolation
export async function cloneTestDatabase(baseClient: PGlite): Promise<{
  db: TestDatabase;
  client: PGlite;
}> {
  const client = await baseClient.clone();
  const db = drizzle(client, { schema });
  return { db, client };
}

async function applyTestSchema(client: PGlite): Promise<void> {
  // Create enums
  await client.exec(`
    CREATE TYPE admin_role AS ENUM ('admin', 'super_admin');
    CREATE TYPE goal_template_status AS ENUM ('published', 'unpublished');
  `);

  // Create tables with SQL
  await client.exec(`
    CREATE TABLE admins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      role admin_role NOT NULL DEFAULT 'admin',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE user_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      has_completed_skin_test BOOLEAN,
      has_completed_booking BOOLEAN,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Add other tables as needed
  `);
}

// Seed test data helper
export async function seedTestData(db: TestDatabase) {
  const [admin] = await db.insert(schema.admins).values({
    email: 'test@example.com',
    role: 'admin',
  }).returning();

  return { admin };
}
```

**Key Points:**
- Use `Map<string, T>` for storage
- Auto-increment counter for IDs: `goal_1`, `goal_2`, etc.
- Methods return `Promise` to match real async DB operations
- Expose `_store` for manual test setup
- Methods return `null` when entity not found (matches Drizzle ORM behavior)

## 4. Test Structure for CRUD Operations

### Create Operation

```typescript
it("creates goal successfully with all required fields", async () => {
  const repo = makeGoalsRepoFake();
  const fixedNow = new Date("2025-01-15T10:30:00Z");

  const deps: GoalDeps = {
    repo,
    now: () => fixedNow
  };

  const data = {
    name: "Clear skin",
    description: "Reduce acne breakouts",
    timeframe: "12 weeks",
  };

  const result = await createGoal(user1Id, data, deps);

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.name).toBe("Clear skin");
    expect(result.data.description).toBe("Reduce acne breakouts");
    expect(result.data.timeframe).toBe("12 weeks");
    expect(result.data.createdAt).toEqual(fixedNow);
    expect(result.data.updatedAt).toEqual(fixedNow);
  }
});
```

### Read/Get Operation

```typescript
it("returns all goals for a specific user ordered by order field", async () => {
  const repo = makeGoalsRepoFake();

  // Manually populate store
  repo._store.set(goal1Id, {
    id: goal1Id,
    userProfileId: user1Id,
    name: "Clear skin",
    description: "Reduce acne",
    timeframe: "12 weeks",
    complete: false,
    order: 0,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  });

  const deps: GoalDeps = {
    repo,
    now: () => new Date("2025-01-15T12:00:00Z")
  };

  const result = await getGoals(user1Id, deps);

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe("Clear skin");
  }
});
```

### Update Operation

**IMPORTANT:** For update tests, manually set up the store with `repo._store.set()`. Do NOT create through the action first.

```typescript
it("updates goal name successfully", async () => {
  const repo = makeGoalsRepoFake();

  // Manually set up existing goal
  repo._store.set(goal1Id, {
    id: goal1Id,
    userProfileId: user1Id,
    name: "Old name",
    description: "Description",
    timeframe: "4 weeks",
    complete: false,
    order: 0,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  });

  const deps: GoalDeps = {
    repo,
    now: () => new Date("2025-01-15T10:30:00Z")
  };

  const result = await updateGoal(goal1Id, { name: "New name" }, deps);

  expect(result.success).toBe(true);
  expect(repo._store.get(goal1Id)!.name).toBe("New name");
});
```

**Why manual setup?**
- Clearer test setup (explicit Given state)
- Follows pattern used in goal-actions, routine-actions, etc.
- Avoids dependency on create action working

### Delete Operation

```typescript
it("deletes goal successfully", async () => {
  const repo = makeGoalsRepoFake();

  // Manually set up goal to delete
  repo._store.set(goal1Id, {
    id: goal1Id,
    userProfileId: user1Id,
    name: "Goal to delete",
    description: "Desc",
    timeframe: "4w",
    complete: false,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const deps: GoalDeps = {
    repo,
    now: () => new Date("2025-01-15T10:30:00Z")
  };

  const result = await deleteGoal(goal1Id, deps);

  expect(result.success).toBe(true);
  expect(repo._store.has(goal1Id)).toBe(false);
});
```

## 5. Testing Try-Catch Error Handling

To test that actions properly catch and handle database errors:

```typescript
describe("Error Handling", () => {
  it("createGoal handles repository errors", async () => {
    const repo = makeGoalsRepoFake();

    // Mock the repo method to throw an error
    repo.create = async () => {
      throw new Error("Database connection failed");
    };

    const deps: GoalDeps = {
      repo,
      now: () => new Date("2025-01-15T10:30:00Z")
    };

    const data = {
      name: "Test goal",
      description: "Test description",
      timeframe: "4 weeks",
    };

    const result = await createGoal(user1Id, data, deps);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to create goal");
    }
  });

  it("updateGoal handles repository errors", async () => {
    const repo = makeGoalsRepoFake();

    // Mock update to throw
    repo.update = async () => {
      throw new Error("Database connection failed");
    };

    const deps: GoalDeps = {
      repo,
      now: () => new Date("2025-01-15T10:30:00Z")
    };

    const result = await updateGoal(goal1Id, { name: "Updated" }, deps);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to update goal");
    }
  });
});
```

**Pattern:**
1. Create fake repo
2. Override the specific method to throw an error
3. Call the action
4. Verify it returns `{ success: false, error: "..." }`

**Do NOT:**
- Use try-catch in the test itself
- Test implementation details of how errors are logged

## 6. Validation Testing

Test all Zod validation scenarios:

```typescript
it("returns error when userId is invalid format", async () => {
  const deps: GoalDeps = {
    repo: makeGoalsRepoFake(),
    now: () => new Date("2025-01-15T10:30:00Z")
  };

  const result = await getGoals("invalid-id", deps);

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toBe("Invalid user ID");
  }
});

it("returns error when name is empty", async () => {
  const deps: GoalDeps = {
    repo: makeGoalsRepoFake(),
    now: () => new Date("2025-01-15T10:30:00Z")
  };

  const data = {
    name: "",
    description: "Description",
    timeframe: "4 weeks",
  };

  const result = await createGoal(user1Id, data, deps);

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toBe("Invalid data");
  }
});

it("returns error when name is whitespace only", async () => {
  const deps: GoalDeps = {
    repo: makeGoalsRepoFake(),
    now: () => new Date("2025-01-15T10:30:00Z")
  };

  const data = {
    name: "   ",
    description: "Description",
    timeframe: "4 weeks",
  };

  const result = await createGoal(user1Id, data, deps);

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toBe("Invalid data");
  }
});
```

## 7. Fixed UUIDs for Tests

Use consistent UUIDs across test files:

```typescript
describe("Goal Actions - Unit Tests", () => {
  // Test UUIDs - increment last segment
  const user1Id = "550e8400-e29b-41d4-a716-446655440000";
  const user2Id = "550e8400-e29b-41d4-a716-446655440001";
  const goal1Id = "650e8400-e29b-41d4-a716-446655440001";
  const goal2Id = "650e8400-e29b-41d4-a716-446655440002";
  // ...
});
```

**Why different prefixes?**
- Users: `550e8400...`
- Goals: `650e8400...`
- Routines: `750e8400...`
- Makes it clear what entity type you're referencing

## 8. Complete Test File Template with PgLite

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDatabase, type TestDatabase } from "@/test/db-helper";
import { makeGoalsRepo } from "./goals.repo";
import * as schema from "@/lib/db/schema";
import type { PGlite } from "@electric-sql/pglite";

describe("Goals Repository - Unit Tests", () => {
  let db: TestDatabase;
  let client: PGlite;
  let repo: ReturnType<typeof makeGoalsRepo>;

  // Test UUIDs
  const user1Id = "550e8400-e29b-41d4-a716-446655440000";
  const templateId = "750e8400-e29b-41d4-a716-446655440001";

  beforeEach(async () => {
    // Create fresh in-memory database for each test
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;

    // Create repository with test database
    repo = makeGoalsRepo(db);

    // Seed base data
    await db.insert(schema.userProfiles).values({
      id: user1Id,
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    });

    await db.insert(schema.skinGoalsTemplate).values({
      id: templateId,
      userId: user1Id,
      status: "published",
      createdBy: "admin-id",
      updatedBy: "admin-id",
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await client.close();
  });

  describe("findByTemplateId", () => {
    it("returns empty array when template has no goals", async () => {
      const goals = await repo.findByTemplateId(templateId);

      expect(goals).toEqual([]);
    });

    it("returns goals ordered by order field", async () => {
      // Insert test goals
      await db.insert(schema.skincareGoals).values([
        { templateId, description: "Goal 2", order: 2 },
        { templateId, description: "Goal 1", order: 1 },
        { templateId, description: "Goal 3", order: 3 },
      ]);

      const goals = await repo.findByTemplateId(templateId);

      expect(goals).toHaveLength(3);
      expect(goals[0].description).toBe("Goal 1");
      expect(goals[1].description).toBe("Goal 2");
      expect(goals[2].description).toBe("Goal 3");
    });
  });

  describe("create", () => {
    it("creates goal with all required fields", async () => {
      const newGoal = await repo.create({
        templateId,
        description: "Clear skin",
        complete: false,
        order: 1,
      });

      expect(newGoal.id).toBeDefined();
      expect(newGoal.description).toBe("Clear skin");
      expect(newGoal.complete).toBe(false);
      expect(newGoal.createdAt).toBeInstanceOf(Date);

      // Verify in database
      const found = await db
        .select()
        .from(schema.skincareGoals)
        .where(eq(schema.skincareGoals.id, newGoal.id));

      expect(found).toHaveLength(1);
    });
  });

  describe("toggleComplete", () => {
    it("marks goal as complete with completedAt timestamp", async () => {
      const [goal] = await db.insert(schema.skincareGoals).values({
        templateId,
        description: "Test goal",
        complete: false,
        order: 1,
      }).returning();

      const updated = await repo.toggleComplete(goal.id, true);

      expect(updated).not.toBeNull();
      expect(updated!.complete).toBe(true);
      expect(updated!.completedAt).toBeInstanceOf(Date);
    });
  });

  describe("Error Handling", () => {
    it("handles database constraint violations", async () => {
      // Try to create goal with non-existent template
      await expect(repo.create({
        templateId: "non-existent-id",
        description: "Test",
        complete: false,
        order: 1,
      })).rejects.toThrow();
    });
  });
});
```

## 9. Common Test Scenarios Checklist

For every CRUD action, write tests for:

### Create Action:
- ✓ Successfully creates with valid data
- ✓ Returns error when required field is empty
- ✓ Returns error when required field is whitespace only
- ✓ Sets timestamps correctly (createdAt, updatedAt)
- ✓ Returns created entity with all fields
- ✓ Handles repository errors (try-catch)

### Get/Read Action:
- ✓ Returns data when entity exists
- ✓ Returns null/empty when entity doesn't exist
- ✓ Returns error when ID is invalid format
- ✓ Filters by correct user (doesn't return other users' data)
- ✓ Returns data in correct order (if order is promised)
- ✓ Handles repository errors (try-catch)

### Update Action:
- ✓ Successfully updates each field individually
- ✓ Successfully updates all fields at once
- ✓ Updates updatedAt timestamp
- ✓ Does NOT update createdAt timestamp
- ✓ Returns error when ID is invalid
- ✓ Returns error when entity not found
- ✓ Returns error when updating field to empty/whitespace
- ✓ Handles empty update object
- ✓ Handles repository errors (try-catch)

### Delete Action:
- ✓ Successfully deletes entity
- ✓ Returns error when ID is invalid
- ✓ Returns error when entity not found
- ✓ Handles repository errors (try-catch)

## 10. Anti-Patterns to Avoid

### ❌ Don't create through action in update/delete tests
```typescript
// BAD
it("updates goal", async () => {
  const createResult = await createGoal(userId, data, deps);
  const goalId = createResult.data.id;

  const result = await updateGoal(goalId, { name: "New" }, deps);
  // ...
});
```

```typescript
// GOOD
it("updates goal", async () => {
  repo._store.set(goal1Id, {
    id: goal1Id,
    // ... full goal object
  });

  const result = await updateGoal(goal1Id, { name: "New" }, deps);
  // ...
});
```

### ❌ Don't use different repos for different tests in same describe
```typescript
// BAD
it("test 1", async () => {
  const repo = makeGoalsRepoFake(); // Different instance
  // ...
});

it("test 2", async () => {
  const repo = makeGoalsRepoFake(); // Different instance
  // ...
});
```

```typescript
// GOOD - use beforeEach
let repo: ReturnType<typeof makeGoalsRepoFake>;

beforeEach(() => {
  repo = makeGoalsRepoFake();
});
```

### ❌ Don't test try-catch by wrapping in try-catch
```typescript
// BAD
it("handles errors", async () => {
  try {
    await createGoal(userId, data, deps);
    fail("Should have thrown");
  } catch (e) {
    expect(e.message).toBe("...");
  }
});
```

```typescript
// GOOD
it("handles errors", async () => {
  repo.create = async () => {
    throw new Error("Database connection failed");
  };

  const result = await createGoal(userId, data, deps);

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toBe("Failed to create goal");
  }
});
```

### ❌ Don't share state between tests
```typescript
// BAD
const sharedGoal = { id: "1", name: "Shared" };

it("test 1", async () => {
  repo._store.set("1", sharedGoal);
  // Modifies sharedGoal
});

it("test 2", async () => {
  repo._store.set("1", sharedGoal); // Now has modifications from test 1
});
```

```typescript
// GOOD
it("test 1", async () => {
  repo._store.set("1", {
    id: "1",
    name: "Goal 1",
    // ... fresh object
  });
});

it("test 2", async () => {
  repo._store.set("1", {
    id: "1",
    name: "Goal 2",
    // ... fresh object
  });
});
```

## Summary

**Follow these patterns exactly:**
1. Use Result type: `{ success: true; data: T } | { success: false; error: string }`
2. Use dependency injection with `Deps` type
3. Create fake repos with `Map` storage and `_store` exposed
4. Use `repo._store.set()` to manually set up data for update/delete tests
5. Test try-catch by mocking repo methods to throw
6. Use fixed UUIDs and timestamps
7. Test all validation scenarios
8. Write one behavior per test

**These patterns are used in:**
- `goal-actions/`
- `routine-actions/`
- `routine-info-actions/`
- `coach-notes-actions/`
- `progress-photos-actions/`
- `profile-header-actions/`
