# API Development Template

**Version:** 1.0
**Last Updated:** 2025-11-08
**Purpose:** Standardized template for developing consumer-app API endpoints

This document provides a complete guide for implementing new API endpoints in the skinbestie-coach-app following our established architectural patterns.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File Structure Template](#file-structure-template)
3. [Layer Responsibilities](#layer-responsibilities)
4. [Implementation Guide](#implementation-guide)
5. [Code Templates](#code-templates)
6. [Testing Guide](#testing-guide)
7. [Checklist](#checklist)

---

## Architecture Overview

We follow a **3-layer architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────┐
│  HTTP Layer (route.ts)                          │
│  - Auth, parsing, validation, HTTP responses    │
└───────────────┬─────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────┐
│  Service Layer (*.service.ts)                   │
│  - Business logic, orchestration                │
└───────────────┬─────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────┐
│  Repository Layer (*.repo.ts)                   │
│  - Database queries, data access                │
└───────────────┬─────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────┐
│  Database (PostgreSQL + Drizzle ORM)            │
└─────────────────────────────────────────────────┘
```

**Key Principles:**
- **Single Responsibility:** Each layer has one clear purpose
- **Dependency Injection:** Factory functions for testability
- **Type Safety:** Zod + TypeScript throughout
- **Standardized Errors:** Consistent error responses
- **Testing:** Integration tests for each HTTP method

---

## File Structure Template

For a new feature called `{feature}`, create this structure:

```
src/app/api/consumer-app/{feature}/
├── route.ts                  # HTTP endpoint handlers
├── {feature}.types.ts        # Zod schemas & TypeScript types (using drizzle-zod)
├── {feature}.service.ts      # Business logic layer
├── {feature}.repo.ts         # Database access layer
└── __tests__/
    ├── route/                # Route layer tests (mocked services)
    │   ├── {feature}.post.route.test.ts
    │   ├── {feature}.get.route.test.ts
    │   ├── {feature}.patch.route.test.ts
    │   └── {feature}.delete.route.test.ts
    ├── service/              # Service layer tests (mocked repository)
    │   ├── {feature}.create.service.test.ts
    │   ├── {feature}.update.service.test.ts
    │   ├── {feature}.delete.service.test.ts
    │   └── {feature}.list.service.test.ts
    └── repo/                 # Repository layer tests (PGlite)
        ├── {feature}.create.repo.test.ts
        ├── {feature}.update.repo.test.ts
        ├── {feature}.delete.repo.test.ts
        └── {feature}.find.repo.test.ts
```

## CRITICAL: Testing Pattern

**⚠️ DO NOT mix route tests and repository tests in the same file!**

### Route Tests (`__tests__/route/{feature}.{method}.route.test.ts`)
- **Purpose:** Test HTTP layer with mocked services
- **Pattern:** Mock the service layer using `vi.mock()`
- **Fast:** No database, quick execution
- **Location:** `__tests__/route/` subdirectory
- **File naming:** `{feature}.post.route.test.ts`, `{feature}.get.route.test.ts`, etc.
- **Naming convention:** `{feature}.{functionality}.route.test.ts`
- **One file per HTTP method**

### Service Tests (`__tests__/service/{feature}.{operation}.service.test.ts`)
- **Purpose:** Test business logic with mocked repository
- **Pattern:** Mock the repository using `vi.fn()`
- **Fast:** No database, quick execution
- **Location:** `__tests__/service/` subdirectory
- **File naming:** `{feature}.create.service.test.ts`, `{feature}.update.service.test.ts`, etc.
- **Naming convention:** `{feature}.{functionality}.service.test.ts`
- **One file per operation (create, update, delete, etc.)**

### Repository Tests (`__tests__/repo/{feature}.{operation}.repo.test.ts`)
- **Purpose:** Test database operations with real PGlite
- **Pattern:** Use dependency injection to pass test database
- **Comprehensive:** Real database, tests constraints, defaults, etc.
- **Location:** `__tests__/repo/` subdirectory
- **File naming:** `{feature}.create.repo.test.ts`, `{feature}.update.repo.test.ts`, etc.
- **Naming convention:** `{feature}.{functionality}.repo.test.ts`
- **One file per operation (create, update, delete, etc.)**

### Why Separate Files?

1. **Different Testing Strategies:** Routes use mocks, repos use real databases
2. **Different Setups:** Route tests mock services, repo tests inject PGlite
3. **Clear Purpose:** Each file tests one layer
4. **Matches Codebase:** This is the pattern used throughout the project

### Examples:

**Journals feature (CORRECT PATTERN):**
```
src/app/api/consumer-app/journals/
├── route.ts
├── journals.types.ts
├── journals.service.ts
├── journals.repo.ts
└── __tests__/
    ├── route/
    │   └── journals.post.route.test.ts       # 16 route tests (mocked services)
    ├── service/
    │   └── journals.create.service.test.ts   # 9 service tests (mocked repo)
    └── repo/
        └── journals.create.repo.test.ts      # 13 repository tests (PGlite)
```

**Surveys feature (CORRECT PATTERN):**
```
src/app/api/admin/surveys/
├── route.ts
├── surveys.types.ts
├── surveys.service.ts
├── surveys.repo.ts
└── __tests__/
    ├── route.test.ts               # Route tests (mocked services)
    └── surveys.repo.test.ts        # Repository tests (PGlite)
```

---

## Layer Responsibilities

### 1. Types Layer (`{feature}.types.ts`)

**Responsibilities:**
- Define Zod validation schemas
- Define TypeScript types (inferred from Zod)
- Define request/response shapes
- Central source of truth for data structures

**What goes here:**
- Request schemas (`createXRequestSchema`, `updateXRequestSchema`)
- Response types (`XResponse`, `XListResponse`)
- Validation rules (required fields, formats, constraints)

**What does NOT go here:**
- Business logic
- Database queries
- HTTP handling

---

### 2. Repository Layer (`{feature}.repo.ts`)

**Responsibilities:**
- Direct database access using Drizzle ORM
- CRUD operations
- Complex queries (joins, aggregations)
- Transaction handling

**What goes here:**
- `create{Feature}()` - Insert operations
- `get{Feature}ById()` - Select by ID
- `list{Features}()` - List with filters
- `update{Feature}()` - Update operations
- `delete{Feature}()` - Delete operations

**What does NOT go here:**
- Business logic
- Validation (that's in types + service)
- HTTP responses
- Service result wrapping

**⚠️ CRITICAL: Dependency Injection Pattern**
- **Factory function:** `create{Feature}Repository(deps?)`
- **MUST accept deps object:** `{ db?: DatabaseType }`
- **MUST use `* as schema`:** Import schema this way for PGlite compatibility
- **MUST reference:** `schema.{features}` not direct imports
- Returns raw database objects
- Null for not found (not errors)

**Why this pattern?**
- Allows PGlite injection for testing
- Prevents "undefined table" errors in tests
- Matches entire codebase pattern (surveys, photos, etc.)

---

### 3. Service Layer (`{feature}.service.ts`)

**Responsibilities:**
- Business logic and orchestration
- Coordinate multiple repo calls
- Apply business rules
- Transform data for API responses

**What goes here:**
- Business validation (beyond schema validation)
- Orchestrating multiple database operations
- Applying defaults
- Error handling and wrapping

**What does NOT go here:**
- HTTP parsing/responses
- Direct database queries (use repo)
- Zod schema definitions

**Key patterns:**
- Factory function: `make{Feature}Service(deps?)`
- Returns `ServiceResult<T>` type
- Dependency injection for repo
- Standardized error messages

---

### 4. HTTP Layer (`route.ts`)

**Responsibilities:**
- Handle HTTP requests and responses
- Authentication
- Request parsing
- Zod validation
- Call service layer
- Return proper HTTP status codes

**What goes here:**
- `GET()`, `POST()`, `PATCH()`, `DELETE()` handlers
- Authentication checks
- Request body parsing
- Response formatting

**What does NOT go here:**
- Business logic (use service)
- Database queries (use repo)
- Complex data transformations

**Key patterns:**
- 5-step pattern (see below)
- Use `errors.unauthorized()`, `errors.invalidRequest()`, etc.
- Return `NextResponse.json()`

---

## Implementation Guide

### Step-by-Step Process

#### 1. Define Database Schema

Add table to `src/lib/db/schema.ts`:

```typescript
export const {features} = pgTable(
  "{features}",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userProfileId: uuid("user_profile_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    // ... other fields
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userProfileIdx: index("{features}_user_profile_idx").on(table.userProfileId),
    // ... other indexes
  }),
);

// Export types
export type {Feature} = typeof {features}.$inferSelect;
export type New{Feature} = typeof {features}.$inferInsert;
```

Generate migration:
```bash
npm run db:generate
npm run db:migrate
```

---

#### 2. Create Types File (`{feature}.types.ts`)

```typescript
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { {features} } from "@/lib/db/schema";
import { z } from "zod";

// ============================================
// Base Schemas (Generated from Drizzle)
// ============================================

// Generate base schemas from database schema
export const insert{Feature}Schema = createInsertSchema({features});
export const select{Feature}Schema = createSelectSchema({features});

// ============================================
// Request Schemas (Customized from base)
// ============================================

// Create request - omit auto-generated fields, add custom validation
export const create{Feature}RequestSchema = insert{Feature}Schema
  .omit({
    id: true,           // Auto-generated
    createdAt: true,    // Auto-generated
    updatedAt: true,    // Auto-generated
  })
  .extend({
    // Add custom validation or override defaults
    // Example: title: z.string().min(1).max(255).optional(),
  });

// Update request - omit fields that can't be updated, make all optional
export const update{Feature}RequestSchema = insert{Feature}Schema
  .omit({
    id: true,           // Can't update ID
    userProfileId: true, // Can't change owner
    createdAt: true,    // Can't update creation time
  })
  .partial(); // All fields optional for PATCH

// ============================================
// TypeScript Types (inferred from schemas)
// ============================================

export type Create{Feature}Request = z.infer<typeof create{Feature}RequestSchema>;
export type Update{Feature}Request = z.infer<typeof update{Feature}RequestSchema>;

// ============================================
// Response Types
// ============================================

export type {Feature}Response = {
  id: string;
  // ... other fields from your database schema
  createdAt: string;
  updatedAt: string;
};
```

**Why drizzle-zod?**
- **Single source of truth**: Database schema drives validation
- **Auto-sync**: Changes to schema automatically update validation
- **Less duplication**: No need to manually maintain matching Zod schemas
- **Type safety**: Ensures request types match database types

---

#### 3. Create Repository File (`{feature}.repo.ts`)

```typescript
import { db as defaultDb } from "@/lib/db";
import { {features} } from "@/lib/db/schema";
import type { New{Feature}, {Feature} } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export type {Feature}RepoDeps = {
  db?: typeof defaultDb;
};

export function make{Feature}Repo(deps: {Feature}RepoDeps = {}) {
  const db = deps.db || defaultDb;

  return {
    /**
     * Create a new {feature}
     */
    async create{Feature}(data: New{Feature}): Promise<{Feature}> {
      const result = await db
        .insert({features})
        .values(data)
        .returning();

      return result[0];
    },

    /**
     * Get {feature} by ID
     */
    async get{Feature}ById(id: string): Promise<{Feature} | null> {
      const result = await db
        .select()
        .from({features})
        .where(eq({features}.id, id))
        .limit(1);

      return result[0] || null;
    },

    /**
     * List {features} for a user
     */
    async list{Features}(userProfileId: string): Promise<{Feature}[]> {
      return await db
        .select()
        .from({features})
        .where(eq({features}.userProfileId, userProfileId))
        .orderBy(desc({features}.createdAt));
    },

    /**
     * Update {feature}
     */
    async update{Feature}(
      id: string,
      data: Partial<New{Feature}>
    ): Promise<{Feature} | null> {
      const result = await db
        .update({features})
        .set({ ...data, updatedAt: new Date() })
        .where(eq({features}.id, id))
        .returning();

      return result[0] || null;
    },

    /**
     * Delete {feature}
     */
    async delete{Feature}(id: string): Promise<boolean> {
      const result = await db
        .delete({features})
        .where(eq({features}.id, id))
        .returning();

      return result.length > 0;
    },
  };
}

// Singleton instance
export const {feature}Repo = make{Feature}Repo();
```

---

#### 4. Create Service File (`{feature}.service.ts`)

```typescript
import type { Create{Feature}Request, Update{Feature}Request } from "./{feature}.types";
import { make{Feature}Repo, type {Feature}RepoDeps } from "./{feature}.repo";
import type { {Feature} } from "@/lib/db/schema";

// ============================================
// Service Result Types
// ============================================

type ServiceSuccess<T> = { success: true; data: T };
type ServiceError = { success: false; error: string };
type ServiceResult<T> = ServiceSuccess<T> | ServiceError;

// ============================================
// Service Dependencies
// ============================================

export type {Feature}ServiceDeps = {
  repo?: ReturnType<typeof make{Feature}Repo>;
};

// ============================================
// Service Factory
// ============================================

export function make{Feature}Service(deps: {Feature}ServiceDeps = {}) {
  const repo = deps.repo || make{Feature}Repo();

  return {
    /**
     * Create a new {feature}
     */
    async create{Feature}(
      request: Create{Feature}Request
    ): Promise<ServiceResult<{Feature}>> {
      try {
        // Apply business logic, defaults, etc.
        const {feature} = await repo.create{Feature}({
          userProfileId: request.userProfileId,
          // ... map request fields
        });

        return { success: true, data: {feature} };
      } catch (error) {
        console.error("[{Feature}Service] Error creating {feature}:", error);
        return {
          success: false,
          error: "Failed to create {feature}"
        };
      }
    },

    /**
     * Get {feature} by ID
     */
    async get{Feature}(id: string): Promise<ServiceResult<{Feature}>> {
      try {
        const {feature} = await repo.get{Feature}ById(id);

        if (!{feature}) {
          return { success: false, error: "{Feature} not found" };
        }

        return { success: true, data: {feature} };
      } catch (error) {
        console.error("[{Feature}Service] Error fetching {feature}:", error);
        return {
          success: false,
          error: "Failed to fetch {feature}"
        };
      }
    },

    /**
     * Update {feature}
     */
    async update{Feature}(
      id: string,
      request: Update{Feature}Request
    ): Promise<ServiceResult<{Feature}>> {
      try {
        // Verify {feature} exists
        const existing = await repo.get{Feature}ById(id);
        if (!existing) {
          return { success: false, error: "{Feature} not found" };
        }

        // Update {feature}
        const updated = await repo.update{Feature}(id, request);

        if (!updated) {
          return { success: false, error: "Failed to update {feature}" };
        }

        return { success: true, data: updated };
      } catch (error) {
        console.error("[{Feature}Service] Error updating {feature}:", error);
        return {
          success: false,
          error: "Failed to update {feature}"
        };
      }
    },

    /**
     * Delete {feature}
     */
    async delete{Feature}(id: string): Promise<ServiceResult<void>> {
      try {
        const deleted = await repo.delete{Feature}(id);

        if (!deleted) {
          return { success: false, error: "{Feature} not found" };
        }

        return { success: true, data: undefined };
      } catch (error) {
        console.error("[{Feature}Service] Error deleting {feature}:", error);
        return {
          success: false,
          error: "Failed to delete {feature}"
        };
      }
    },
  };
}

// Singleton instance
export const {feature}Service = make{Feature}Service();
```

---

#### 5. Create Route File (`route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../shared/auth";
import { errors } from "../shared/errors";
import {
  create{Feature}RequestSchema,
  update{Feature}RequestSchema
} from "./{feature}.types";
import { make{Feature}Service } from "./{feature}.service";

/**
 * POST /api/consumer-app/{features}
 * Create a new {feature}
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const isAuthenticated = await validateApiKey();
    if (!isAuthenticated) {
      return errors.unauthorized();
    }

    // 2. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errors.invalidRequest("Invalid JSON in request body");
    }

    // 3. Validate request body
    const validation = create{Feature}RequestSchema.safeParse(body);
    if (!validation.success) {
      return errors.invalidRequest(
        "Invalid request body",
        validation.error.issues
      );
    }

    // 4. Call service layer
    const service = make{Feature}Service();
    const result = await service.create{Feature}(validation.data);

    // 5. Handle service errors
    if (!result.success) {
      return errors.internalError(result.error);
    }

    // 6. Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.data.id,
          // ... map response fields
          createdAt: result.data.createdAt.toISOString(),
          updatedAt: result.data.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /{features}] Unexpected error:", error);
    return errors.internalError("Failed to create {feature}");
  }
}

/**
 * GET /api/consumer-app/{features}
 * List {features} for a user
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const isAuthenticated = await validateApiKey();
    if (!isAuthenticated) {
      return errors.unauthorized();
    }

    // 2. Get query parameters
    const { searchParams } = new URL(request.url);
    const userProfileId = searchParams.get("userProfileId");

    if (!userProfileId) {
      return errors.invalidRequest("userProfileId is required");
    }

    // 3. Call service layer
    const service = make{Feature}Service();
    const result = await service.list{Features}(userProfileId);

    // 4. Handle service errors
    if (!result.success) {
      return errors.internalError(result.error);
    }

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        data: result.data.map((item) => ({
          id: item.id,
          // ... map response fields
          createdAt: item.createdAt.toISOString(),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /{features}] Unexpected error:", error);
    return errors.internalError("Failed to fetch {features}");
  }
}
```

**For dynamic routes (`[id]/route.ts`):**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../../shared/auth";
import { errors } from "../../shared/errors";
import { update{Feature}RequestSchema } from "../{feature}.types";
import { make{Feature}Service } from "../{feature}.service";

/**
 * GET /api/consumer-app/{features}/[id]
 * Get a single {feature}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentication
    const isAuthenticated = await validateApiKey();
    if (!isAuthenticated) {
      return errors.unauthorized();
    }

    // 2. Get {feature} ID from params
    const { id } = await params;

    // 3. Call service layer
    const service = make{Feature}Service();
    const result = await service.get{Feature}(id);

    // 4. Handle service errors
    if (!result.success) {
      if (result.error === "{Feature} not found") {
        return errors.notFound("{Feature}");
      }
      return errors.internalError(result.error);
    }

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.data.id,
          // ... map response fields
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /{features}/[id]] Unexpected error:", error);
    return errors.internalError("Failed to fetch {feature}");
  }
}

/**
 * PATCH /api/consumer-app/{features}/[id]
 * Update a {feature}
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentication
    const isAuthenticated = await validateApiKey();
    if (!isAuthenticated) {
      return errors.unauthorized();
    }

    // 2. Get {feature} ID from params
    const { id } = await params;

    // 3. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errors.invalidRequest("Invalid JSON in request body");
    }

    // 4. Validate request body
    const validation = update{Feature}RequestSchema.safeParse(body);
    if (!validation.success) {
      return errors.invalidRequest(
        "Invalid request body",
        validation.error.issues
      );
    }

    // 5. Call service layer
    const service = make{Feature}Service();
    const result = await service.update{Feature}(id, validation.data);

    // 6. Handle service errors
    if (!result.success) {
      if (result.error === "{Feature} not found") {
        return errors.notFound("{Feature}");
      }
      return errors.internalError(result.error);
    }

    // 7. Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.data.id,
          // ... map response fields
          updatedAt: result.data.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PATCH /{features}/[id]] Unexpected error:", error);
    return errors.internalError("Failed to update {feature}");
  }
}

/**
 * DELETE /api/consumer-app/{features}/[id]
 * Delete a {feature}
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentication
    const isAuthenticated = await validateApiKey();
    if (!isAuthenticated) {
      return errors.unauthorized();
    }

    // 2. Get {feature} ID from params
    const { id } = await params;

    // 3. Call service layer
    const service = make{Feature}Service();
    const result = await service.delete{Feature}(id);

    // 4. Handle service errors
    if (!result.success) {
      if (result.error === "{Feature} not found") {
        return errors.notFound("{Feature}");
      }
      return errors.internalError(result.error);
    }

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        message: "{Feature} deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[DELETE /{features}/[id]] Unexpected error:", error);
    return errors.internalError("Failed to delete {feature}");
  }
}
```

---

#### 6. Create Tests

**Important:** Create three subdirectories in `__tests__/`: `route/`, `service/`, and `repo/`

**See the [Testing Guide](#testing-guide) section below for complete examples.**

**Route Tests** (`__tests__/route/{feature}.post.route.test.ts`):
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../../route";
import { NextRequest } from "next/server";
import * as {feature}Service from "../../{feature}.service";

// Mock the service for route-layer tests
vi.mock("../../{feature}.service");

// Mock auth
vi.mock("../../../shared/auth", () => ({
  validateApiKey: vi.fn(),
}));

import { validateApiKey } from "../../../shared/auth";

describe("POST /api/consumer-app/{features}", () => {
  const mockCreate{Feature}Service = vi.mocked({feature}Service.create{Feature}Service);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 201 when service succeeds", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(true);

    const mockService = {
      create{Feature}: vi.fn().mockResolvedValue({
        success: true,
        data: { id: "123", /* ... */ },
      }),
    };

    mockCreate{Feature}Service.mockReturnValue(mockService as any);

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/{features}",
      {
        method: "POST",
        body: JSON.stringify({ /* ... */ })
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  // ... more route tests
});
```

**Service Tests** (`__tests__/service/{feature}.create.service.test.ts`):
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { create{Feature}Service } from "../../{feature}.service";
import type { I{Feature}Repository } from "../../{feature}.repo";

describe("{Feature} Service - Create", () => {
  let mockRepo: I{Feature}Repository;

  beforeEach(() => {
    mockRepo = {
      create{Feature}: vi.fn(),
    };
  });

  it("should create {feature} with defaults", async () => {
    const mockData = { id: "123", /* ... */ };
    vi.mocked(mockRepo.create{Feature}).mockResolvedValue(mockData);

    const service = create{Feature}Service(mockRepo);
    const result = await service.create{Feature}("user-123", {});

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockData);
  });

  // ... more service tests
});
```

**Repository Tests** (`__tests__/repo/{feature}.create.repo.test.ts`):
```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDatabase, cleanupTestDatabase, type TestDatabase } from "@/test/db-helper";
import { create{Feature}Repository } from "../../{feature}.repo";
import * as schema from "@/lib/db/schema";
import type { PGlite } from "@electric-sql/pglite";

describe("{Feature} Repository - Create", () => {
  let db: TestDatabase;
  let client: PGlite;
  let repo: ReturnType<typeof create{Feature}Repository>;

  beforeEach(async () => {
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;

    // CRITICAL: Pass { db } not just db
    repo = create{Feature}Repository({ db });
  });

  afterEach(async () => {
    await cleanupTestDatabase(client);
  });

  it("should create {feature} in database", async () => {
    const result = await repo.create{Feature}({ /* ... */ });

    expect(result.id).toBeDefined();
    // ... more assertions
  });

  // ... more repository tests
});
```

---

## Testing Guide

### ⚠️ CRITICAL: Three Test Layers - READ THIS FIRST!

**DO NOT mix route, service, and repository tests!**

**Why this matters:**
- **Route tests** mock services → fast, isolated HTTP testing
- **Service tests** mock repository → fast, isolated business logic testing
- **Repository tests** use PGlite → comprehensive database testing
- Each layer has a different purpose and testing strategy
- **Mixing them creates architectural confusion and breaks dependency injection**

**The correct pattern:**
1. Write route tests in `__tests__/route/{feature}.{method}.route.test.ts` (mock services)
2. Write service tests in `__tests__/service/{feature}.{operation}.service.test.ts` (mock repository)
3. Write repository tests in `__tests__/repo/{feature}.{operation}.repo.test.ts` (inject PGlite)
4. Never mix these different testing strategies in one file!

### Test File Organization

**File naming:** `{feature}.{functionality}.{type}.test.ts`

1. **Route Tests** (`__tests__/route/`) - One file per HTTP method:
   - `{feature}.post.route.test.ts` - Tests POST endpoint (mocked services)
   - `{feature}.get.route.test.ts` - Tests GET endpoint (mocked services)
   - `{feature}.patch.route.test.ts` - Tests PATCH endpoint (mocked services)
   - `{feature}.delete.route.test.ts` - Tests DELETE endpoint (mocked services)

2. **Service Tests** (`__tests__/service/`) - One file per operation:
   - `{feature}.create.service.test.ts` - Tests create logic (mocked repo)
   - `{feature}.update.service.test.ts` - Tests update logic (mocked repo)
   - `{feature}.delete.service.test.ts` - Tests delete logic (mocked repo)
   - `{feature}.list.service.test.ts` - Tests list/find logic (mocked repo)

3. **Repository Tests** (`__tests__/repo/`) - One file per operation:
   - `{feature}.create.repo.test.ts` - Tests create query (PGlite)
   - `{feature}.update.repo.test.ts` - Tests update query (PGlite)
   - `{feature}.delete.repo.test.ts` - Tests delete query (PGlite)
   - `{feature}.find.repo.test.ts` - Tests find queries (PGlite)

### Route Test Structure

Route tests mock the service layer for fast, isolated HTTP testing:

**Location:** `__tests__/route/{feature}.post.route.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../../route";
import { NextRequest } from "next/server";
import * as {feature}Service from "../../{feature}.service";

// Mock the service for route-layer tests
vi.mock("../../{feature}.service", () => ({
  create{Feature}Service: vi.fn(),
  make{Feature}Service: vi.fn(),
}));

// Mock auth for route-layer tests
vi.mock("../../../shared/auth", () => ({
  validateApiKey: vi.fn(),
}));

import { validateApiKey } from "../../../shared/auth";

describe("POST /api/consumer-app/{features}", () => {
  // Test UUIDs
  const TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000";
  const TEST_{FEATURE}_ID = "660e8400-e29b-41d4-a716-446655440001";

  const mockCreate{Feature}Service = vi.mocked({feature}Service.create{Feature}Service);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(validateApiKey).mockResolvedValue(false);

      const request = new NextRequest(
        "http://localhost:3000/api/consumer-app/{features}",
        { method: "POST", body: JSON.stringify({}) }
      );

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });

    describe("Validation", () => {
      it("should return 400 if required field is missing", async () => {
        // Test validation
      });
    });

    describe("Success Cases", () => {
      it("should return 201 when service succeeds", async () => {
        const mockService = {
          create{Feature}: vi.fn().mockResolvedValue({
            success: true,
            data: { id: "{feature}-123", /* ... */ },
          }),
        };

        mockMake{Feature}Service.mockReturnValue(mockService as any);

        const request = new NextRequest(
          "http://localhost:3000/api/consumer-app/{features}",
          {
            method: "POST",
            body: JSON.stringify({ /* valid data */ }),
          }
        );

        const response = await POST(request);
        expect(response.status).toBe(201);
      });
    });

    describe("Error Handling", () => {
      it("should return 500 when service fails", async () => {
        const mockService = {
          create{Feature}: vi.fn().mockResolvedValue({
            success: false,
            error: "Database error",
          }),
        };

        mockCreate{Feature}Service.mockReturnValue(mockService as any);

        const request = new NextRequest(
          "http://localhost:3000/api/consumer-app/{features}",
          {
            method: "POST",
            headers: { "x-api-key": "valid-key" },
            body: JSON.stringify({ userProfileId: TEST_USER_ID }),
          }
        );

        const response = await POST(request);
        expect(response.status).toBe(500);

        const data = await response.json();
        expect(data.error.code).toBe("INTERNAL_ERROR");
      });

      it("should return 500 if service throws unexpected error", async () => {
        const mockService = {
          create{Feature}: vi
            .fn()
            .mockRejectedValue(new Error("Unexpected database error")),
        };
        mockCreate{Feature}Service.mockReturnValue(mockService as any);

        const request = new NextRequest(
          "http://localhost:3000/api/consumer-app/{features}",
          {
            method: "POST",
            headers: { "x-api-key": "valid-key" },
            body: JSON.stringify({ userProfileId: TEST_USER_ID }),
          }
        );

        const response = await POST(request);
        expect(response.status).toBe(500);

        const data = await response.json();
        expect(data.error.code).toBe("INTERNAL_ERROR");
      });
    });
  });
});
```

### Service Test Structure

Service tests mock the repository layer to test business logic in isolation:

**File:** `{feature}.service.create.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { create{Feature}Service } from "../{feature}.service";
import type { I{Feature}Repository } from "../{feature}.repo";

describe("{Feature} Service - create{Feature}", () => {
  let mockRepo: I{Feature}Repository;

  beforeEach(() => {
    mockRepo = {
      create{Feature}: vi.fn(),
      get{Feature}ById: vi.fn(),
      update{Feature}: vi.fn(),
      delete{Feature}: vi.fn(),
    };
  });

  it("should successfully create {feature} with all fields", async () => {
    const mock{Feature} = {
      id: "{feature}-123",
      userProfileId: "user-123",
      title: "My {Feature}",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockRepo.create{Feature}).mockResolvedValue(mock{Feature});

    const service = create{Feature}Service(mockRepo);
    const result = await service.create{Feature}("user-123", {
      title: "My {Feature}",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mock{Feature});
    }
    expect(mockRepo.create{Feature}).toHaveBeenCalledWith({
      userProfileId: "user-123",
      title: "My {Feature}",
      // ... default values applied by service
    });
  });

  it("should apply default values when not provided", async () => {
    const mock{Feature} = {
      id: "{feature}-123",
      userProfileId: "user-123",
      title: "Default Title",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockRepo.create{Feature}).mockResolvedValue(mock{Feature});

    const service = create{Feature}Service(mockRepo);
    const result = await service.create{Feature}("user-123", {});

    expect(result.success).toBe(true);
    expect(mockRepo.create{Feature}).toHaveBeenCalledWith({
      userProfileId: "user-123",
      title: "Default Title", // Service applied default
    });
  });

  it("should return error when repository throws exception", async () => {
    vi.mocked(mockRepo.create{Feature}).mockRejectedValue(
      new Error("Database connection failed")
    );

    const service = create{Feature}Service(mockRepo);
    const result = await service.create{Feature}("user-123", {
      title: "My {Feature}",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to create {feature}");
    }
  });
});
```

### Repository Test Structure

Repository tests use PGlite to test database operations with dependency injection:

**File:** `{feature}.repo.create.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestDatabase,
  cleanupTestDatabase,
  type TestDatabase,
} from "@/test/db-helper";
import { create{Feature}Repository } from "../{feature}.repo";
import * as schema from "@/lib/db/schema";
import type { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";

describe("{Feature} Repository - Integration Tests (PGlite)", () => {
  let db: TestDatabase;
  let client: PGlite;
  let repo: ReturnType<typeof create{Feature}Repository>;

  // Test UUIDs
  const testUserId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(async () => {
    // Create fresh in-memory database for each test
    const setup = await createTestDatabase();
    db = setup.db;
    client = setup.client;

    // Create repository with test database using DEPENDENCY INJECTION
    repo = create{Feature}Repository({ db });

    // Seed test user
    await db.insert(schema.userProfiles).values({
      id: testUserId,
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      phoneNumber: "+1234567890",
      dateOfBirth: new Date("1990-01-01"),
      timezone: "America/New_York",
    });
  });

  afterEach(async () => {
    await cleanupTestDatabase(client);
  });

  describe("create{Feature}", () => {
    it("should create {feature} in database with defaults", async () => {
      const {feature} = await repo.create{Feature}({
        userProfileId: testUserId,
      });

      expect({feature}.id).toBeDefined();
      expect({feature}.userProfileId).toBe(testUserId);
      expect({feature}.createdAt).toBeInstanceOf(Date);

      // Verify in database
      const result = await db
        .select()
        .from(schema.{features})
        .where(eq(schema.{features}.id, {feature}.id));

      expect(result).toHaveLength(1);
    });

    it("should auto-generate UUID for {feature} ID", async () => {
      const {feature} = await repo.create{Feature}({
        userProfileId: testUserId,
      });

      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect({feature}.id).toMatch(uuidPattern);
    });
  });

  describe("Database Constraints", () => {
    it("should fail if userProfileId references non-existent user (FK constraint)", async () => {
      const nonExistentUserId = "999e8400-e29b-41d4-a716-446655440999";

      await expect(
        repo.create{Feature}({
          userProfileId: nonExistentUserId,
        }),
      ).rejects.toThrow();
    });

    it("should cascade delete {feature} when user profile is deleted", async () => {
      // Create {feature}
      const {feature} = await repo.create{Feature}({
        userProfileId: testUserId,
      });

      // Verify {feature} exists
      let result = await db
        .select()
        .from(schema.{features})
        .where(eq(schema.{features}.id, {feature}.id));
      expect(result).toHaveLength(1);

      // Delete user profile
      await db
        .delete(schema.userProfiles)
        .where(eq(schema.userProfiles.id, testUserId));

      // Verify {feature} was cascade deleted
      result = await db
        .select()
        .from(schema.{features})
        .where(eq(schema.{features}.id, {feature}.id));
      expect(result).toHaveLength(0);
    });
  });
});
```

### ⚠️ Key Differences Between Test Types

| Aspect | Route Tests | Service Tests | Repository Tests |
|--------|-------------|---------------|------------------|
| **File** | `{feature}.post.test.ts` | `{feature}.service.create.test.ts` | `{feature}.repo.create.test.ts` |
| **Tests** | HTTP layer | Business logic layer | Database layer |
| **Mocking** | Mock service layer with `vi.mock()` | Mock repository with `vi.fn()` | No mocks, real database |
| **Database** | None (services mocked) | None (repo mocked) | PGlite (in-memory PostgreSQL) |
| **Setup** | Mock service return values | Mock repo return values | Inject test database via deps |
| **Speed** | Very fast (~10ms for 16 tests) | Very fast (~5ms for 9 tests) | Slower (~6s for 13 tests) |
| **Purpose** | Test HTTP, auth, validation | Test defaults, business rules | Test queries, constraints, defaults |
| **Organization** | One file per HTTP method | One file per operation | One file per operation |

### Testing Terminology Note

**What are these tests?**

The industry doesn't have consensus on terminology. Here's how different experts classify tests with databases:

- **Martin Fowler (Test Pyramid):** Integration tests
- **Jay Fields (Working Effectively with Unit Tests):** Sociable unit tests
- **Google:** Larger tests
- **Our approach:** Unit tests with database

**Why "Unit Tests with Database"?**
- You're testing ONE feature (CREATE) in isolation ✅
- PGlite is fast and reliable ✅
- Martin Fowler: "If talking to the resource is stable and fast enough for you then there's no reason not to do it in your unit tests"

**References:**
- [Martin Fowler - The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Martin Fowler - Unit Test (Solitary vs Sociable)](https://martinfowler.com/bliki/UnitTest.html)
- [Google - Software Engineering at Google (Ch14)](https://abseil.io/resources/swe-book/html/ch14.html)

### Common Test Patterns

**Mock the service layer:**
```typescript
vi.mock("../{feature}.service");

import * as {feature}Service from "../{feature}.service";

const mockService = {
  create{Feature}: vi.fn().mockResolvedValue({
    success: true,
    data: { /* mock data */ },
  }),
};

vi.mocked({feature}Service.make{Feature}Service).mockReturnValue(mockService as any);
```

**Create test database:**
```typescript
import { createTestDatabase, cleanupTestDatabase } from "@/test/db-helper";
import type { PGlite } from "@electric-sql/pglite";

let db: TestDatabase;
let client: PGlite;

beforeEach(async () => {
  const setup = await createTestDatabase();
  db = setup.db;
  client = setup.client;
});

afterEach(async () => {
  await cleanupTestDatabase(client);
});
```

**Create test requests:**
```typescript
const request = new NextRequest(
  "http://localhost:3000/api/consumer-app/{features}",
  {
    method: "POST",
    body: JSON.stringify({ /* request body */ })
  }
);
```

**Assert responses:**
```typescript
const response = await POST(request);
expect(response.status).toBe(201);

const data = await response.json();
expect(data.success).toBe(true);
expect(data.data.id).toBeDefined();
```

---

## Checklist

### Before Starting Implementation

- [ ] Database schema designed and documented
- [ ] Feature requirements clearly understood
- [ ] API endpoints defined (what HTTP methods needed?)
- [ ] Request/response shapes documented

### During Implementation

- [ ] Database schema added to `src/lib/db/schema.ts`
- [ ] Migration generated and reviewed: `npm run db:generate`
- [ ] Migration applied: `npm run db:migrate`
- [ ] Types file created with Zod schemas
- [ ] Repository file created with CRUD methods
- [ ] Service file created with business logic
- [ ] Route file created with HTTP handlers
- [ ] Tests created for each HTTP method
- [ ] All tests passing: `npm run test:run`
- [ ] TypeScript checks passing: `npx tsc --noEmit`
- [ ] Linting passing: `npm run lint`

### Before Committing

- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Code follows established patterns
- [ ] Error messages are clear and helpful
- [ ] Console logs use descriptive prefixes (e.g., `[{Feature}Service]`)
- [ ] Documentation updated if needed

---

## Common Patterns Reference

### Error Handling

**Use standardized errors:**
```typescript
import { errors } from "../shared/errors";

return errors.unauthorized();           // 401
return errors.notFound("Resource");     // 404
return errors.invalidRequest("Message", details);  // 400
return errors.internalError("Message"); // 500
```

### Service Result Pattern

**Always return ServiceResult:**
```typescript
type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Success
return { success: true, data: result };

// Error
return { success: false, error: "User-friendly message" };
```

### Dependency Injection

**Use factory functions:**
```typescript
export function makeMyService(deps: MyServiceDeps = {}) {
  const repo = deps.repo || makeMyRepo();
  const otherService = deps.otherService || makeOtherService();

  return {
    async doSomething() {
      // Use injected dependencies
    }
  };
}
```

### 5-Step Route Handler Pattern

**Every route handler follows this pattern:**

1. **Authenticate** - Validate API key
2. **Parse** - Extract params, query, body
3. **Validate** - Use Zod schemas
4. **Service Call** - Delegate to service layer
5. **Respond** - Return success or error response

```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const isAuthenticated = await validateApiKey();
    if (!isAuthenticated) return errors.unauthorized();

    // 2. Parse
    const body = await request.json();

    // 3. Validate
    const validation = schema.safeParse(body);
    if (!validation.success) {
      return errors.invalidRequest("...", validation.error.issues);
    }

    // 4. Service Call
    const service = makeService();
    const result = await service.doSomething(validation.data);

    // 5. Respond
    if (!result.success) return errors.internalError(result.error);
    return NextResponse.json({ success: true, data: result.data }, { status: 201 });
  } catch (error) {
    console.error("[Route] Error:", error);
    return errors.internalError("Failed to process request");
  }
}
```

### Response Format

**Success responses:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "...": "..."
  }
}
```

**Error responses:**
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "User-friendly message",
    "details": [/* optional validation details */]
  }
}
```

---

## Examples

See these implementations as reference:

- **Surveys API**: `src/app/api/consumer-app/surveys/`
- **Photos API**: `src/app/api/consumer-app/photos/`
- **Journals API**: `src/app/api/consumer-app/journals/` (if implemented)

---

## Questions?

If you're unsure about any pattern or convention:

1. Check existing implementations for reference
2. Review this template
3. Ask the team for clarification

**Consistency is key!** Following these patterns makes the codebase easier to maintain and understand.
