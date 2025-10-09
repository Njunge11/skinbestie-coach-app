# Password Reset Testing Documentation

## Overview
The password reset feature has comprehensive test coverage following the testing guide principles with clear separation between **unit tests** and **integration tests**.

## Test Types

### Unit Tests (`.test.ts` files)
**Location**: `src/app/api/*/route.test.ts`

**What they test**: Individual API route handlers in isolation

**Key characteristics**:
- ✅ No real database (uses `vi.mock` to stub DB operations)
- ✅ No real HTTP server (calls handlers directly with fake req/res)
- ✅ No real external services (email service stubbed)
- ✅ Fast execution (~20-30ms per test suite)
- ✅ Deterministic and repeatable

**Files**:
- `src/app/api/admins/create/route.test.ts` (5 tests)
- `src/app/api/auth/forgot-password/route.test.ts` (5 tests)
- `src/app/api/auth/verify-code/route.test.ts` (7 tests)
- `src/app/api/auth/reset-password/route.test.ts` (14 tests)

**Example from testing guide**:
```typescript
// Unit test - stubs the database
it("returns 400 when email is invalid format", async () => {
  const request = new NextRequest('http://localhost:3000/api/admins/create', {
    method: 'POST',
    body: JSON.stringify({ email: 'invalid-email' }),
  });

  const response = await POST(request);
  const data = await response.json();

  expect(response.status).toBe(400);
  expect(data.error).toContain('Invalid email address');
});
```

### UI Tests (`.test.tsx` files)
**Location**: `src/components/**/*.test.tsx`

**What they test**: React component behavior and user interactions

**Key characteristics**:
- ✅ Uses React Testing Library for user-centric testing
- ✅ Mocks external dependencies (fetch, APIs)
- ✅ Tests from the user's perspective (roles, labels, interactions)
- ✅ Fast execution (~50-300ms per test)
- ✅ Deterministic and isolated

**Example from login-form.test.tsx**:
```typescript
// UI test - mocks fetch calls to API
describe('LoginForm - UI Tests', () => {
  beforeEach(() => {
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/auth/forgot-password')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ message: 'Code sent' }),
        });
      }
      // ... other mocks
    });
  });

  it('allows user to complete full password reset flow', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: /forgot your password/i }));
    expect(screen.getByRole('heading')).toHaveTextContent(/reset password/i);
    // ... continues testing user journey
  });
});
```

### Integration Tests (`.integration.test.ts` files)
**Location**: `src/app/api/auth/password-reset.integration.test.ts`

**What they test**: Complete password reset flow with real database behavior

**Key characteristics**:
- ✅ Uses **PGlite** (in-memory PostgreSQL) for real database interactions
- ✅ Applies actual Drizzle migrations before each test
- ✅ Tests full user journeys across multiple functions
- ✅ Each test gets a fresh database (isolation)
- ✅ Slower execution (~100-400ms per test) but realistic

**Files**:
- `src/app/api/auth/password-reset.integration.test.ts` (6 tests)

**Tests**:
1. Complete password reset flow (create admin → send code → validate → reset password)
2. Prevents reusing verification codes
3. Rejects expired verification codes
4. Invalidates old codes when creating new ones
5. Rejects incorrect verification codes
6. Handles password requirements correctly

**Example**:
```typescript
// Integration test - uses real PGlite database
it('allows admin to reset password with valid verification code', async () => {
  // Step 1: Create admin account
  const [admin] = await db.insert(admins).values({
    email: 'test@example.com',
    name: 'Test Admin',
    passwordSet: false,
  }).returning();

  // Step 2: Create verification code
  const { plainCode, record } = await createNewVerificationCode(admin.id);

  // Step 3: Validate code
  const validatedCode = await validateVerificationCode(admin.email, plainCode);
  expect(validatedCode).toBeDefined();

  // Step 4: Set new password
  const passwordHash = await hashPassword('NewSecurePass123');
  await db.update(admins).set({ passwordHash, passwordSet: true })
    .where(eq(admins.id, admin.id));

  // Step 5: Mark code as used
  await markCodeAsUsed(record.id);

  // Verify everything worked
  const [updatedAdmin] = await db.select().from(admins)
    .where(eq(admins.id, admin.id)).limit(1);

  expect(updatedAdmin.passwordSet).toBe(true);
  const isValid = await verifyPassword('NewSecurePass123', updatedAdmin.passwordHash!);
  expect(isValid).toBe(true);
});
```

## Test Setup

### PGlite Integration (for `.integration.test.ts` files)
**Location**: `src/test/setup.ts`

The setup file uses Vitest's `vi.mock` to replace the real PostgreSQL database with PGlite:

```typescript
// Mock the database module to use PGlite for integration tests
vi.mock('@/lib/db/index', async (importOriginal) => {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  return {
    ...(await importOriginal()),
    db,
    client,
  };
});

// Apply migrations ONCE before all tests (performance optimization)
beforeAll(async () => {
  await applyMigrations(client as PGlite);
});

// Clear data after each test (keep schema for speed)
afterEach(async () => {
  await db.execute(sql`TRUNCATE TABLE admins, verification_codes RESTART IDENTITY CASCADE`);
});
```

**Performance notes:**
- Migrations run once at startup, not before each test
- `TRUNCATE` clears data while preserving table structure (much faster than DROP/CREATE)
- Unit tests (`.test.ts`) override this mock with their own inline mocks

### Migration Application
**Location**: `src/lib/db/migrate.ts`

Integration tests apply actual Drizzle migrations from `src/lib/db/migrations/`:

```typescript
export async function applyMigrations(client: PGlite) {
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: './src/lib/db/migrations' });
}
```

## Test Isolation

### Unit Tests
- Each test is independent
- Database operations are stubbed with `vi.mock` at file level
- No shared state between tests

### Integration Tests
- **Schema created ONCE** via `beforeAll` (migrations applied once)
- **Data cleared after EACH test** via `afterEach` (TRUNCATE tables)
- Prevents data pollution between tests
- Each test can create admins with the same email without conflicts
- Fast isolation: keeps table structure, only clears data

## Running Tests

```bash
# Run all tests
npm run test:run

# Run only unit tests
npm run test:run src/app/api/auth/**/*.test.ts

# Run only integration tests
npm run test:run src/app/api/auth/**/*.integration.test.ts

# Run specific test file
npm run test:run src/app/api/auth/password-reset.integration.test.ts
```

## Test Coverage

**Total**: 86 tests across all test types
- **Unit tests** (`.test.ts`): 31 tests (API routes with mocked externals)
- **UI tests** (`.test.tsx`): 49 tests (React components with mocked fetch)
- **Integration tests** (`.integration.test.ts`): 6 tests (full flows with PGlite)

**Success rate**: 100% ✅ (86/86 passing)

## Following the Testing Guide

Our tests follow all core principles from `docs/TESTING.md`:

✅ **Test WHAT, not HOW**: Assert outcomes, not internal implementation
✅ **One behavior per test**: Each test has one Given/When/Then
✅ **Use the front door**: Call exported functions, not internals
✅ **Deterministic**: Fixed inputs, predictable outputs
✅ **Clear separation**: Unit tests use stubs, integration tests use real DB
✅ **Test isolation**: Each integration test gets fresh database
✅ **No real externals in unit tests**: All database/HTTP/email stubbed

## Benefits of This Approach

1. **Fast feedback**: Unit tests run in milliseconds
2. **Confidence**: Integration tests verify real database behavior
3. **Isolated failures**: Easy to pinpoint what broke
4. **Safe refactoring**: Internal changes don't break unit tests
5. **CI/CD ready**: No external dependencies, all tests run anywhere
6. **Realistic testing**: PGlite provides actual PostgreSQL semantics
