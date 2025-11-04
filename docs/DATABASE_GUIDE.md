# Database Performance Guide - Drizzle ORM & PostgreSQL

> **A comprehensive guide to building performant database schemas and queries with Drizzle ORM**
>
> Last updated: January 2025
> Based on: Drizzle ORM v0.31.0+ and PostgreSQL 15+

## Table of Contents

1. [Core Principles](#core-principles)
2. [Schema Design Best Practices](#schema-design-best-practices)
3. [Indexing Strategy](#indexing-strategy)
4. [Query Optimization](#query-optimization)
5. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
6. [Performance Checklist](#performance-checklist)
7. [References](#references)

---

## Core Principles

### 1. **Indexes Are Not Optional**
Every production table MUST have indexes. Without them, queries perform full table scans (O(n) instead of O(log n)).

**Impact**: A query on 10,000 rows without an index can be **100-1000x slower** than with proper indexes.

**Source**: [Drizzle ORM - Indexes & Constraints](https://orm.drizzle.team/docs/indexes-constraints)

### 2. **Fetch Only What You Need**
Always specify columns in `.select()`. Never fetch entire tables.

**Bad**:
```typescript
const users = await db.select().from(userProfiles); // Fetches ALL columns
```

**Good**:
```typescript
const users = await db.select({
  id: userProfiles.id,
  name: userProfiles.name,
  email: userProfiles.email,
}).from(userProfiles);
```

### 3. **One Query Is Better Than Many**
Avoid N+1 queries. Use JOINs or batch operations.

**Source**: [API with NestJS - Drizzle ORM Indexes](http://wanago.io/2024/09/02/api-nestjs-drizzle-orm-indexes-postgresql/)

---

## Schema Design Best Practices

### Table Definition Template

```typescript
import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const exampleTable = pgTable(
  'example_table',
  {
    // 1. PRIMARY KEY (always use uuid for distributed systems)
    id: uuid('id').primaryKey().defaultRandom(),

    // 2. FOREIGN KEYS (with cascading deletes)
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // 3. DATA COLUMNS
    name: text('name').notNull(),
    description: text('description'),

    // 4. STATUS/ENUM COLUMNS (use text, not enums for flexibility)
    status: text('status').notNull().default('pending'),

    // 5. TIMESTAMPS (always include these)
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // 6. INDEXES (define in second parameter)
  (table) => ({
    // Index on FK for fast joins
    userIdIdx: index('example_user_id_idx').on(table.userId),

    // Composite index for common query patterns
    userStatusIdx: index('example_user_status_idx').on(
      table.userId,
      table.status
    ),

    // Partial index for specific conditions
    activePendingIdx: index('example_active_pending_idx')
      .on(table.userId)
      .where(sql`status = 'pending'`),
  })
);
```

### Primary Key Strategy

**✅ DO**: Use UUID for primary keys
```typescript
// UUIDv4 (Random) - default
id: uuid('id').primaryKey().defaultRandom()

// UUIDv7 (Time-ordered) - recommended for better performance
id: uuid('id').primaryKey().default(sql`gen_random_uuid_v7()`)
```

**Why**:
- Prevents enumeration attacks
- Works well in distributed systems
- No conflicts when merging databases

**UUID Versions**:
- **UUIDv4 (Random)**: Best security, but poor B-tree index performance (random insertion causes page splits)
- **UUIDv7 (Time-ordered)**: Good security + better B-tree performance (time-ordered prefix reduces page splits)

**Note**: UUIDv7 requires PostgreSQL 13+

**❌ DON'T**: Use auto-incrementing integers in user-facing systems
```typescript
id: serial('id').primaryKey() // Exposes count, enumerable
```

**Sources**:
- [pganalyze - UUIDs vs Serial](https://pganalyze.com/blog/5mins-postgres-uuid-vs-serial-primary-keys)
- [Bytebase - UUID Performance](https://www.bytebase.com/blog/choose-primary-key-uuid-or-auto-increment/)

### Foreign Key Strategy

**✅ DO**: Always specify cascade behavior
```typescript
userId: uuid('user_id')
  .notNull()
  .references(() => users.id, { onDelete: 'cascade' })
```

**Options**:
- `cascade` - Delete child records when parent is deleted (most common)
- `set null` - Set FK to null (for soft references)
- `restrict` - Prevent deletion if children exist
- `no action` - Database default (usually restrict)

**❌ DON'T**: Omit cascade behavior
```typescript
userId: uuid('user_id').references(() => users.id) // Unclear behavior
```

### Timestamp Strategy

**✅ DO**: Always use timezone-aware timestamps
```typescript
createdAt: timestamp('created_at', { withTimezone: true })
  .notNull()
  .defaultNow()
```

**Why**: Handles users across timezones correctly

**❌ DON'T**: Use date without timezone
```typescript
createdAt: timestamp('created_at') // No timezone info
```

### Enum vs Text for Status Fields

**✅ DO**: Use text with comments
```typescript
status: text('status').notNull().default('pending')
// Valid values: 'pending' | 'active' | 'completed' | 'cancelled'
```

**Why**:
- Easy to add new values (no migration needed)
- Drizzle doesn't have great enum support
- Can validate in application layer with Zod

**❌ DON'T**: Use PostgreSQL enums
```typescript
status: pgEnum('status', ['pending', 'active', 'completed'])
// Hard to modify, requires migrations
```

---

## Indexing Strategy

### Index Types in PostgreSQL

| Type | Use Case | Performance |
|------|----------|-------------|
| **B-tree** (default) | Equality, range queries | Fastest for most cases |
| **GIN** | JSONB, arrays, full-text search | Good for contains queries |
| **GiST** | Geometric data, full-text | General purpose |
| **Hash** | Equality only | Rarely needed |
| **BRIN** | Large tables with natural order | Low overhead |

**Source**: [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)

### When to Add Indexes

**Rule of thumb**: Index every column used in:
1. `WHERE` clauses
2. `JOIN` conditions
3. `ORDER BY` clauses
4. Foreign keys

### Single Column Index

```typescript
export const users = pgTable('users', {
  email: text('email').notNull(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
}));
```

**Use case**: `WHERE email = 'user@example.com'`

### Composite Index (Multiple Columns)

```typescript
export const orders = pgTable('orders', {
  userId: uuid('user_id').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at').notNull(),
}, (table) => ({
  // Column order matters! Most selective first
  userStatusDateIdx: index('orders_user_status_date_idx').on(
    table.userId,
    table.status,
    table.createdAt.desc()
  ),
}));
```

**Use case**: `WHERE userId = ? AND status = ? ORDER BY createdAt DESC`

**Column order matters**:
- First column: Most selective (filters most rows)
- Last column: Used for sorting

**Performance**: Can be **10-100x faster** than separate indexes

**Source**: [Drizzle ORM Best Practices 2025](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717)

### Partial Index (Filtered)

```typescript
export const tasks = pgTable('tasks', {
  userId: uuid('user_id').notNull(),
  status: text('status').notNull(),
}, (table) => ({
  // Only index pending tasks
  userPendingIdx: index('tasks_user_pending_idx')
    .on(table.userId)
    .where(sql`status = 'pending'`),
}));
```

**Use case**: `WHERE userId = ? AND status = 'pending'`

**Benefits**:
- Smaller index size (only indexes subset)
- Faster writes (less index maintenance)
- Can be **275x faster** for filtered queries

**Source**: [Drizzle Indexes Performance](http://wanago.io/2024/09/02/api-nestjs-drizzle-orm-indexes-postgresql/)

### Covering Index (Include Columns)

```typescript
export const products = pgTable('products', {
  categoryId: uuid('category_id').notNull(),
  name: text('name').notNull(),
  price: integer('price').notNull(),
}, (table) => ({
  // Index includes extra columns needed in SELECT
  categoryCoveringIdx: index('products_category_covering_idx')
    .on(table.categoryId, table.name, table.price),
}));
```

**Use case**: `SELECT name, price FROM products WHERE categoryId = ?`

**Benefit**: Postgres can return data from index alone (no table lookup)

**Performance**: Can be **10-100x faster** when index covers all needed columns (enables index-only scans)

**Source**: [PostgreSQL 17 Performance Tuning - Index-Only Scans](https://medium.com/@jramcloud1/15-postgresql-17-performance-tuning-index-scans-vs-index-only-scans-f85bcf0a715c)

### Case-Insensitive Index

```typescript
export const users = pgTable('users', {
  email: text('email').notNull(),
}, (table) => ({
  emailLowerIdx: index('users_email_lower_idx')
    .on(sql`LOWER(email)`),
}));
```

**Use case**: `WHERE LOWER(email) = LOWER('USER@EXAMPLE.COM')`

**Required for**: Case-insensitive searches

### Index on Foreign Keys

**✅ ALWAYS index foreign keys**:
```typescript
export const comments = pgTable('comments', {
  postId: uuid('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
}, (table) => ({
  postIdIdx: index('comments_post_id_idx').on(table.postId),
}));
```

**Why**:
- JOINs are slow without FK indexes
- Cascade deletes are slow without FK indexes

**Source**: Common PostgreSQL best practice

### Index Naming Convention

```
{table}_{columns}_{type}_idx

Examples:
- users_email_idx
- orders_user_status_date_idx
- tasks_user_pending_partial_idx
```

---

## Query Optimization

### 1. Always Specify Columns

**❌ BAD** - Fetches ALL columns:
```typescript
const users = await db
  .select()
  .from(userProfiles)
  .where(eq(userProfiles.id, userId));
```

**✅ GOOD** - Fetches only needed columns:
```typescript
const users = await db
  .select({
    id: userProfiles.id,
    name: userProfiles.name,
    email: userProfiles.email,
  })
  .from(userProfiles)
  .where(eq(userProfiles.id, userId));
```

**Benefits**:
- Reduces network transfer (10-50% depending on table structure)
- Lower memory usage and deserialization overhead
- **Most important**: Enables use of covering indexes (index-only scans)
- Smaller result sets easier to cache and serialize

### 2. Use Batch Operations

**❌ BAD** - N+1 query problem:
```typescript
for (const userId of userIds) {
  const user = await db.select().from(users).where(eq(users.id, userId));
}
// Makes 100 queries for 100 users
```

**✅ GOOD** - Single batch query:
```typescript
const users = await db
  .select()
  .from(users)
  .where(inArray(users.id, userIds));
// Makes 1 query for 100 users
```

**Performance**: **100x faster** for 100 items

### 3. Use Prepared Statements for Repeated Queries

**❌ BAD** - Query parsed every time:
```typescript
export async function getUser(userId: string) {
  return await db
    .select()
    .from(users)
    .where(eq(users.id, userId));
}
```

**✅ GOOD** - Query parsed once:
```typescript
const getUserStmt = db
  .select({
    id: users.id,
    name: users.name,
    email: users.email,
  })
  .from(users)
  .where(eq(users.id, sql.placeholder('userId')))
  .prepare('get_user_by_id');

export async function getUser(userId: string) {
  return await getUserStmt.execute({ userId });
}
```

**Performance**: Can significantly improve performance for repeated complex queries by eliminating parsing overhead. Benefit varies by query complexity and execution frequency. Most beneficial for queries executed frequently with different parameters.

**Source**: [Drizzle Prepared Statements](https://orm.drizzle.team/docs/perf-queries#prepared-statements)

### 4. Avoid Double Queries for Count + Data

**❌ BAD** - Two queries:
```typescript
const total = await db
  .select({ count: sql<number>`count(*)` })
  .from(users);

const users = await db
  .select()
  .from(users)
  .limit(20)
  .offset(0);
```

**✅ GOOD** - Single query with window function:
```typescript
const results = await db
  .select({
    id: users.id,
    name: users.name,
    totalCount: sql<number>`COUNT(*) OVER()`.as('total_count'),
  })
  .from(users)
  .limit(20)
  .offset(0);

const totalCount = results[0]?.totalCount || 0;
```

**Performance trade-off**:
- Reduces network round trips (1 query vs 2)
- **BUT**: Can be slower due to WindowAgg overhead (especially for simple queries)
- Best when: Query has complex WHERE clause without perfect index support
- Worse when: Simple indexed lookups where parallel scans can be used
- **Benchmark both approaches for your specific use case**

**Source**: [DBA StackExchange - Window Functions Performance](https://dba.stackexchange.com/questions/220157/performance-of-count-vs-count-in-a-window-function)

### 5. Use Transactions for Multiple Writes

**❌ BAD** - Each statement is a transaction:
```typescript
await db.insert(users).values(userData);
await db.insert(profiles).values(profileData);
await db.insert(settings).values(settingsData);
```

**✅ GOOD** - Single transaction:
```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values(userData);
  await tx.insert(profiles).values(profileData);
  await tx.insert(settings).values(settingsData);
});
```

**Benefits**:
- Atomic (all or nothing)
- Faster (less overhead)
- Data consistency

**Source**: [Drizzle Transactions](https://orm.drizzle.team/docs/transactions)

### 6. Use JOINs Instead of Multiple Queries

**❌ BAD** - Fetch separately:
```typescript
const user = await db.select().from(users).where(eq(users.id, userId));
const posts = await db.select().from(posts).where(eq(posts.userId, userId));
```

**✅ GOOD** - JOIN in single query:
```typescript
const result = await db
  .select({
    userId: users.id,
    userName: users.name,
    postId: posts.id,
    postTitle: posts.title,
  })
  .from(users)
  .leftJoin(posts, eq(posts.userId, users.id))
  .where(eq(users.id, userId));
```

**Performance**: **2x faster**, less network overhead

### 7. Use WHERE Before JOIN

**❌ BAD** - Filter after JOIN:
```typescript
const result = await db
  .select()
  .from(users)
  .leftJoin(posts, eq(posts.userId, users.id))
  .where(eq(users.status, 'active')); // Filters AFTER join
```

**✅ GOOD** - Filter before JOIN:
```typescript
const activeUsers = db
  .select()
  .from(users)
  .where(eq(users.status, 'active'))
  .as('active_users');

const result = await db
  .select()
  .from(activeUsers)
  .leftJoin(posts, eq(posts.userId, activeUsers.id));
```

**Why**: Smaller dataset to join = faster

---

## Custom SQL Migrations

### Creating Custom Migrations

Drizzle supports custom SQL migrations for operations not supported by the schema DSL or for data seeding.

**Generate a custom migration file**:
```bash
drizzle-kit generate --custom --name=seed-users
```

This creates an empty SQL file in your migrations folder.

### Statement Breakpoint Syntax

**CRITICAL**: All custom SQL migrations MUST use `--> statement-breakpoint` comments between SQL statements.

**❌ WRONG** - Will fail with PGlite and may cause issues:
```sql
-- Custom SQL migration
DROP INDEX IF EXISTS "users_email_idx";

CREATE INDEX "users_email_lower_idx" ON "users" USING btree (LOWER(email));

INSERT INTO "users" ("name") VALUES('Admin');
```

**✅ CORRECT** - Properly separated statements:
```sql
-- Custom SQL migration
DROP INDEX IF EXISTS "users_email_idx";
--> statement-breakpoint
CREATE INDEX "users_email_lower_idx" ON "users" USING btree (LOWER(email));
--> statement-breakpoint
INSERT INTO "users" ("name") VALUES('Admin');
```

### Why Statement Breakpoints Are Required

Drizzle's migrator splits migration files by `--> statement-breakpoint` comments and executes each statement individually. This is required because:

1. **PGlite compatibility**: PGlite's prepared statements only support single commands
2. **Error isolation**: Each statement is tracked separately in migration history
3. **Rollback safety**: Failed migrations can be resumed from the last successful statement

**Without statement breakpoints**, you'll see errors like:
```
Error: cannot insert multiple commands into a prepared statement
```

### Statement Breakpoint Best Practices

**✅ DO**:
- Add `--> statement-breakpoint` between EVERY SQL statement
- Use the exact format: `--> statement-breakpoint` (SQL comment with two dashes and one space)
- Place on its own line between statements
- Use in ALL custom migrations, even single statements (for consistency)

**❌ DON'T**:
- Use different formats like `-- statement-breakpoint` or `-->statement-breakpoint`
- Put multiple statements without breakpoints
- Assume semicolons alone are sufficient

### Example: Complex Custom Migration

```sql
-- Custom SQL migration: Add deferrable constraints

-- 1. Drop existing index
DROP INDEX IF EXISTS "goals_user_order_idx";
--> statement-breakpoint
-- 2. Create deferrable constraint
ALTER TABLE "goals"
ADD CONSTRAINT "goals_user_order_unique"
UNIQUE ("user_id", "order")
DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
-- 3. Seed initial data
INSERT INTO "goals" ("user_id", "name", "order")
VALUES ('123e4567-e89b-12d3-a456-426614174000', 'First Goal', 1);
--> statement-breakpoint
-- 4. Create supporting index
CREATE INDEX "goals_user_active_idx"
ON "goals" ("user_id")
WHERE "status" = 'active';
```

### Applying Custom Migrations

Custom migrations run automatically with:
```bash
npm run db:migrate
```

Drizzle tracks each statement separately in the `__drizzle_migrations` table.

**Source**: [Drizzle ORM - Custom Migrations](https://orm.drizzle.team/docs/kit-custom-migrations)

---

## Common Pitfalls & Solutions

### Pitfall #1: Missing Indexes on Foreign Keys

**Problem**:
```typescript
export const comments = pgTable('comments', {
  postId: uuid('post_id')
    .notNull()
    .references(() => posts.id),
  // ❌ No index defined!
});
```

**Impact**: JOINs are extremely slow

**Solution**:
```typescript
export const comments = pgTable('comments', {
  postId: uuid('post_id')
    .notNull()
    .references(() => posts.id),
}, (table) => ({
  postIdIdx: index('comments_post_id_idx').on(table.postId), // ✅
}));
```

**Performance gain**: **100-1000x faster** for joins

---

### Pitfall #2: No Indexes on WHERE Clause Columns

**Problem**:
```typescript
// Query
const pending = await db
  .select()
  .from(tasks)
  .where(eq(tasks.status, 'pending'));

// Schema - NO index on status!
export const tasks = pgTable('tasks', {
  status: text('status').notNull(),
});
```

**Impact**: Full table scan on every query

**Solution**:
```typescript
export const tasks = pgTable('tasks', {
  status: text('status').notNull(),
}, (table) => ({
  statusIdx: index('tasks_status_idx').on(table.status), // ✅
}));
```

---

### Pitfall #3: Over-Indexing

**Problem**:
```typescript
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone'),
  address: text('address'),
}, (table) => ({
  // ❌ Too many indexes!
  emailIdx: index().on(table.email),
  firstNameIdx: index().on(table.firstName),
  lastNameIdx: index().on(table.lastName),
  phoneIdx: index().on(table.phone),
  addressIdx: index().on(table.address),
}));
```

**Impact**:
- Slow writes (must update 5+ indexes)
- Wasted disk space
- Slower backups

**Solution**: Only index columns used in WHERE/JOIN/ORDER BY
```typescript
export const users = pgTable('users', {
  /* ... */
}, (table) => ({
  emailIdx: index().on(table.email), // ✅ Used in login
  // Remove unused indexes
}));
```

**Rule**: Max 3-5 indexes per table unless you have specific reasons

**Source**: [Drizzle Best Practices](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717)

---

### Pitfall #4: Wrong Composite Index Order

**Problem**:
```typescript
// Query: WHERE userId = ? AND status = ?
export const tasks = pgTable('tasks', {
  userId: uuid('user_id').notNull(),
  status: text('status').notNull(),
}, (table) => ({
  // ❌ Wrong order!
  statusUserIdx: index().on(table.status, table.userId),
}));
```

**Impact**: Index not used efficiently

**Solution**: Most selective column first
```typescript
export const tasks = pgTable('tasks', {
  userId: uuid('user_id').notNull(),
  status: text('status').notNull(),
}, (table) => ({
  // ✅ Correct order
  userStatusIdx: index().on(table.userId, table.status),
}));
```

**Why**:
- `userId` is more selective (1000 users vs 3 statuses)
- Index can skip to user's tasks, then filter by status

---

### Pitfall #5: Using SELECT * in Application Code

**Problem**:
```typescript
// ❌ Fetches all 20+ columns when you only need 3
const users = await db.select().from(userProfiles);
```

**Impact**:
- More network transfer
- More memory usage
- Slower serialization

**Solution**:
```typescript
// ✅ Only fetch what you need
const users = await db.select({
  id: userProfiles.id,
  name: userProfiles.name,
  email: userProfiles.email,
}).from(userProfiles);
```

---

### Pitfall #6: N+1 Queries

**Problem**:
```typescript
// ❌ Makes 1 + N queries
const users = await db.select().from(users);

for (const user of users) {
  const posts = await db
    .select()
    .from(posts)
    .where(eq(posts.userId, user.id));
}
// 1 query for users + 100 queries for posts = 101 queries!
```

**Impact**: **100x slower** for 100 users

**Solution #1**: Use JOIN
```typescript
const result = await db
  .select({
    userId: users.id,
    userName: users.name,
    postId: posts.id,
    postTitle: posts.title,
  })
  .from(users)
  .leftJoin(posts, eq(posts.userId, users.id));
// 1 query total
```

**Solution #2**: Batch fetch with IN
```typescript
const users = await db.select().from(users);
const userIds = users.map(u => u.id);

const posts = await db
  .select()
  .from(posts)
  .where(inArray(posts.userId, userIds));

// Group posts by userId in application code
const postsByUser = posts.reduce((acc, post) => {
  if (!acc[post.userId]) acc[post.userId] = [];
  acc[post.userId].push(post);
  return acc;
}, {});
// 2 queries total
```

---

### Pitfall #7: Not Using Transactions for Related Inserts

**Problem**:
```typescript
// ❌ If second insert fails, first one remains (inconsistent state)
const [user] = await db.insert(users).values(userData).returning();
const [profile] = await db.insert(profiles).values({
  userId: user.id,
  ...profileData
}).returning();
```

**Impact**: Data inconsistency if error occurs

**Solution**:
```typescript
// ✅ All or nothing
const result = await db.transaction(async (tx) => {
  const [user] = await tx.insert(users).values(userData).returning();
  const [profile] = await tx.insert(profiles).values({
    userId: user.id,
    ...profileData
  }).returning();

  return { user, profile };
});
```

---

### Pitfall #8: Using ILIKE Without Index

**Problem**:
```typescript
// Query
const users = await db
  .select()
  .from(users)
  .where(ilike(users.email, '%example.com%'));

// Schema - no index!
export const users = pgTable('users', {
  email: text('email').notNull(),
});
```

**Impact**: Full table scan (very slow)

**Solution**:
```typescript
export const users = pgTable('users', {
  email: text('email').notNull(),
}, (table) => ({
  // Case-insensitive index
  emailLowerIdx: index('users_email_lower_idx')
    .on(sql`LOWER(email)`),
}));

// Query with LOWER
const users = await db
  .select()
  .from(users)
  .where(sql`LOWER(email) LIKE LOWER('%example.com%')`);
```

**Note**: Prefix searches (`'example%'`) are fast, contains searches (`'%example%'`) are always slow. Consider full-text search for contains.

---

### Pitfall #9: Fetching Large Result Sets Without Pagination

**Problem**:
```typescript
// ❌ Fetches 10,000+ rows into memory
const allUsers = await db.select().from(users);
```

**Impact**: Out of memory errors, slow API responses

**Solution**:
```typescript
// ✅ Paginate
const users = await db
  .select()
  .from(users)
  .limit(20)
  .offset(page * 20);
```

**Or use cursor-based pagination** (better for large datasets):
```typescript
const users = await db
  .select()
  .from(users)
  .where(gt(users.id, lastSeenId))
  .orderBy(users.id)
  .limit(20);
```

---

### Pitfall #10: Not Handling Null vs Undefined

**Problem**:
```typescript
// Database returns null
const user = await db.select().from(users).where(eq(users.id, userId));

// TypeScript expects undefined
interface User {
  avatar?: string; // undefined
}

// ❌ Type mismatch
return user; // avatar is string | null, not string | undefined
```

**Solution**:
```typescript
return {
  ...user,
  avatar: user.avatar ?? undefined, // Convert null to undefined
};
```

---

### Pitfall #11: Using Date Objects in SQL Template Literals

**Problem**:
When using raw SQL template literals with `sql` from Drizzle ORM, Date objects behave differently between test (PGlite) and production (postgres-js) database drivers.

```typescript
// ❌ WRONG - Fails in production with postgres-js driver
const date = new Date();
const result = await db
  .select()
  .from(routineStepCompletions)
  .where(
    sql`${schema.routineStepCompletions.gracePeriodEnd} > ${date}`
  );

// Error in production:
// TypeError: The "string" argument must be of type string or an instance
// of Buffer or ArrayBuffer. Received an instance of Date
```

**Why it happens**:
- **PGlite** (test environment): Automatically converts Date objects to timestamps
- **postgres-js** (production): Requires explicit string formatting in SQL templates
- Tests pass but production fails due to driver differences

**Solution**:
Always convert Date objects to ISO strings when using them in SQL template literals:

```typescript
// ✅ CORRECT - Works in both test and production
const date = new Date();
const currentTimestamp = date.toISOString();

const result = await db
  .select()
  .from(routineStepCompletions)
  .where(
    sql`${schema.routineStepCompletions.gracePeriodEnd} > ${currentTimestamp}::timestamptz`
  );
```

**Alternative**: Use Drizzle's built-in operators instead of raw SQL:
```typescript
// ✅ BEST - Drizzle handles the conversion
import { gt } from 'drizzle-orm';

const result = await db
  .select()
  .from(routineStepCompletions)
  .where(
    gt(schema.routineStepCompletions.gracePeriodEnd, date)
  );
```

**Key Takeaways**:
1. Always use `.toISOString()` when passing Date objects to SQL templates
2. Prefer Drizzle's type-safe operators (`gt`, `lt`, `eq`) over raw SQL when possible
3. Be aware that PGlite (tests) and postgres-js (production) handle types differently
4. This applies to any complex JavaScript type used in SQL templates

**Real-world example**:
```typescript
// dashboard.repo.ts:294,336
async getCatchupSteps(userId: string, date: Date) {
  const userTimezone = userProfile.timezone;
  const todayInUserTz = formatInTimeZone(date, userTimezone, "yyyy-MM-dd");
  const currentTimestamp = date.toISOString(); // ✅ Convert to string

  return await database
    .select()
    .from(schema.routineStepCompletions)
    .where(
      and(
        sql`${schema.routineStepCompletions.scheduledDate} < ${todayInUserTz}::date`,
        sql`${schema.routineStepCompletions.gracePeriodEnd} > ${currentTimestamp}::timestamptz`
      )
    );
}
```

---

## Performance Checklist

Use this checklist before deploying:

### Schema Design
- [ ] All tables have primary keys (UUID preferred)
- [ ] All foreign keys have cascade behavior specified
- [ ] All timestamps use `withTimezone: true`
- [ ] Status fields use text, not enums
- [ ] Every table has `createdAt` and `updatedAt`

### Indexes
- [ ] Every foreign key column has an index
- [ ] Every column used in WHERE has an index
- [ ] Composite indexes are ordered by selectivity (most selective first)
- [ ] Partial indexes used for common filtered queries
- [ ] No more than 5 indexes per table (unless justified)

### Queries
- [ ] All `.select()` calls specify columns (no SELECT *)
- [ ] No N+1 queries (use JOINs or batch fetches)
- [ ] Pagination used for large result sets
- [ ] Prepared statements used for hot paths
- [ ] Transactions used for related writes
- [ ] COUNT queries use window functions (not separate query)

### Repository Layer
- [ ] All repos use dependency injection for testing
- [ ] Batch operations available (createMany, updateMany, findByIds)
- [ ] No business logic in repos (only data access)

### Testing
- [ ] Integration tests use fake repos (not real DB)
- [ ] Performance tests for critical queries (< 100ms target)

---

## References

### Official Drizzle Documentation
- [Indexes & Constraints](https://orm.drizzle.team/docs/indexes-constraints)
- [Prepared Statements](https://orm.drizzle.team/docs/perf-queries#prepared-statements)
- [Transactions](https://orm.drizzle.team/docs/transactions)
- [Select Queries](https://orm.drizzle.team/docs/select)

### Community Resources
- [Drizzle ORM Best Practices 2025](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717)
- [Drizzle ORM Performance Guide](http://wanago.io/2024/09/02/api-nestjs-drizzle-orm-indexes-postgresql/)

### PostgreSQL Documentation
- [Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html)
- [Query Performance](https://www.postgresql.org/docs/current/performance-tips.html)

---

## Appendix: Real-World Example

Here's a complete example of a well-designed table:

```typescript
import { pgTable, uuid, text, timestamp, date, integer, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const orders = pgTable(
  'orders',
  {
    // Primary key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign keys
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Business data
    orderNumber: text('order_number').notNull().unique(),
    status: text('status').notNull().default('pending'),
    // Valid: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

    totalAmount: integer('total_amount').notNull(), // Cents
    currency: text('currency').notNull().default('USD'),

    // Metadata
    shippingAddress: text('shipping_address').notNull(),
    notes: text('notes'),

    // Dates
    orderDate: date('order_date', { mode: 'date' }).notNull(),
    shippedAt: timestamp('shipped_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // FK index for joins
    userIdIdx: index('orders_user_id_idx').on(table.userId),

    // Composite for common query: "user's pending orders"
    userStatusIdx: index('orders_user_status_idx').on(
      table.userId,
      table.status
    ),

    // Composite for "orders by date" with covering
    orderDateStatusIdx: index('orders_date_status_idx').on(
      table.orderDate.desc(),
      table.status,
      table.totalAmount // Covering - included in index
    ),

    // Partial index for "pending orders needing attention"
    pendingOldIdx: index('orders_pending_old_idx')
      .on(table.createdAt)
      .where(sql`status = 'pending' AND created_at < NOW() - INTERVAL '7 days'`),

    // Unique constraint on order number
    orderNumberUniq: index('orders_order_number_uniq').on(table.orderNumber),
  })
);
```

**This schema includes**:
- ✅ UUID primary key
- ✅ Proper foreign key with cascade
- ✅ Timezone-aware timestamps
- ✅ Text for status (not enum)
- ✅ Appropriate indexes for common queries
- ✅ Composite indexes in correct order
- ✅ Partial index for specific use case
- ✅ Covering index to avoid table lookups

---

**End of Guide**

Keep this guide updated as you learn more patterns and encounter new performance issues.
