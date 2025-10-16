# Unit Testing Guide

## Table of Contents
1. What is a unit test
2. Core rules
3. Test structure
4. Test doubles (stub / fake / mock)
5. Externals: do this, not that
    * Database
    * HTTP
    * Filesystem
    * Clock / Time
    * Randomness / IDs
6. Routes/controllers: unit vs integration
7. Smells (fix these)
8. Refactors vs. breaking changes (contracts) — data-structure caveat
9. Checklists
10. Litmus test

## What is a unit test
* Tests one small piece (function/module) through its public API (the exported function real code calls).
* Uses no real externals: no real DB, no real HTTP server/calls, no real filesystem, no real "now", no Math.random() / crypto.randomUUID().
* Replace externals with stubs/fakes so tests are fast, deterministic, and repeatable.

If any real external is involved, it's not a unit test (that's integration/E2E).

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
* **Fake** → in-memory mini implementation with state and maybe simple rules. Use to assert outcomes without a real DB/queue.
* **Mock** → verify that a specific external call happened. Use only when the external call is the requirement (e.g., "send one email"). (Google: interaction checks only when the interaction is the contract.)

**Chooser:** value → Stub; state/rules → Fake; must prove external call → Mock.

## Externals: do this, not that

### Database
**Real (not in unit tests):** Postgres/MySQL/Mongo/Redis; ORMs hitting them; SQLite/H2/Testcontainers.

**Unit test:** use an in-memory fake repo (Map) or a stub.

```typescript
// admins.repo.fake.ts
export function makeAdminsRepoFake() {
  const store = new Map<string, any>();
  return {
    getByEmail(email: string) { return Promise.resolve(store.get(email)); },
    save(admin: any) {
      if (store.has(admin.email)) return Promise.reject(new Error("duplicate"));
      store.set(admin.email, admin);
      return Promise.resolve();
    }
  };
}

// admin.service.ts (functions)
export function makeAdminService(deps: { repo: ReturnType<typeof makeAdminsRepoFake> }) {
  return {
    async create(dto: { email: string; name: string }) {
      const existing = await deps.repo.getByEmail(dto.email);
      if (existing) throw new Error("duplicate");
      const admin = { ...dto, role: "ADMIN" };
      await deps.repo.save(admin);
      return admin;
    }
  };
}

// admin.service.unit.test.ts
it("creates admin with default role", async () => {
  const repo = makeAdminsRepoFake();
  const svc = makeAdminService({ repo });

  const admin = await svc.create({ email: "a@b.com", name: "Ada" });

  expect(admin).toMatchObject({ email: "a@b.com", name: "Ada", role: "ADMIN" });
  expect(await repo.getByEmail("a@b.com")).toBeDefined(); // state in fake
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
* **Unit (handler only):** Call the handler function directly with fake req/res and fakes for deps. Do not start a server. Do not use a real DB.
* **Integration:** Start the app and/or use a real DB (e.g., supertest + Testcontainers). This is not a unit test.

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

### "Is this a unit test?"
* Calls exported function of a small module? **Yes**
* Uses no real externals (DB/HTTP/FS/time/random)? **Yes** (uses stubs/fakes)
* One behavior with Given/When/Then? **Yes**
* Deterministic (fixed time/IDs)? **Yes**

### "Stub vs Fake vs Mock?"
* Need a value → **Stub**
* Need state/rules → **Fake**
* Need to prove an external call (and that call is the promise) → **Mock**

### "Should I assert order?"
* Promised order? **Yes** (assert exact order)
* No promise? **No** (assert membership + count, or sort in test)

## Litmus test
Refactor internals (rename private helpers, change internal data structures). If tests still pass, you tested WHAT. If they break, you tested HOW (tighten tests to public behavior only).
