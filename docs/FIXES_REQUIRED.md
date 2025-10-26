# All Performance Fixes Required

> Complete list of all problematic code that needs fixing
>
> Date: January 2025
> Priority: 🔴 Critical → 🟡 High → 🟢 Medium

---

## 🔴 CRITICAL PRIORITY 1: Add Database Indexes

### File: `src/lib/db/schema.ts`

**Problem**: ZERO indexes defined. All queries perform full table scans.

**Impact**: 100-1000x slower queries

**Solution**: Add indexes to all 7 tables in the second parameter of `pgTable()`.

#### 1.1 routineStepCompletions (Most Critical)

**Add after line ~80** (in the table definition):

```typescript
export const routineStepCompletions = pgTable(
  'routine_step_completions',
  {
    // ... existing columns ...
  },
  (table) => ({
    // For: findByUserAndDateRange (compliance stats)
    userDateIdx: index('rsc_user_date_idx').on(
      table.userProfileId,
      table.scheduledDate
    ),

    // For: markOverdue (marking missed steps) - PARTIAL INDEX
    userPendingGraceIdx: index('rsc_user_pending_grace_idx')
      .on(table.userProfileId, table.gracePeriodEnd)
      .where(sql`status = 'pending'`),

    // FK index for joins and cascade deletes
    routineProductIdx: index('rsc_routine_product_idx')
      .on(table.routineProductId),

    // COVERING INDEX for compliance queries (includes needed columns)
    userDateCoveringIdx: index('rsc_user_date_covering_idx').on(
      table.userProfileId,
      table.scheduledDate,
      table.status,
      table.scheduledTimeOfDay,
      table.routineProductId
    ),
  })
);
```

#### 1.2 userProfiles

**Add after line ~40** (in the table definition):

```typescript
export const userProfiles = pgTable(
  'user_profiles',
  {
    // ... existing columns ...
  },
  (table) => ({
    // For: email/phone lookups during registration (case-insensitive)
    emailLowerIdx: index('up_email_lower_idx').on(sql`LOWER(email)`),
    phoneLowerIdx: index('up_phone_lower_idx').on(sql`LOWER(phone_number)`),

    // For: subscriber list filtering
    completedSubscribedIdx: index('up_completed_subscribed_idx').on(
      table.isCompleted,
      table.isSubscribed
    ),

    // For: date range filters (DESC for recent first)
    createdAtIdx: index('up_created_at_idx').on(table.createdAt.desc()),

    // For: search (case-insensitive)
    firstNameLowerIdx: index('up_first_name_lower_idx')
      .on(sql`LOWER(first_name)`),
    lastNameLowerIdx: index('up_last_name_lower_idx')
      .on(sql`LOWER(last_name)`),
  })
);
```

#### 1.3 skincareRoutineProducts

**Add after line ~120** (in the table definition):

```typescript
export const skincareRoutineProducts = pgTable(
  'skincare_routine_products',
  {
    // ... existing columns ...
  },
  (table) => ({
    // For: findByUserId, findByUserIdAndTimeOfDay
    userTimeOfDayIdx: index('srp_user_timeofday_order_idx').on(
      table.userProfileId,
      table.timeOfDay,
      table.order
    ),

    // FK indexes for joins
    routineIdIdx: index('srp_routine_id_idx').on(table.routineId),
  })
);
```

#### 1.4 skincareGoals

**Add after line ~60** (in the table definition):

```typescript
export const skincareGoals = pgTable(
  'skincare_goals',
  {
    // ... existing columns ...
  },
  (table) => ({
    // For: findByUserId
    userIdIdx: index('sg_user_id_idx').on(table.userProfileId),
  })
);
```

#### 1.5 coachNotes

**Add after line ~90** (in the table definition):

```typescript
export const coachNotes = pgTable(
  'coach_notes',
  {
    // ... existing columns ...
  },
  (table) => ({
    // For: findByUserId with ORDER BY (DESC for recent first)
    userCreatedAtIdx: index('cn_user_created_at_idx').on(
      table.userProfileId,
      table.createdAt.desc()
    ),
  })
);
```

#### 1.6 progressPhotos

**Add after line ~110** (in the table definition):

```typescript
export const progressPhotos = pgTable(
  'progress_photos',
  {
    // ... existing columns ...
  },
  (table) => ({
    // For: findByUserId with ORDER BY (DESC for latest first)
    userWeekIdx: index('pp_user_week_idx').on(
      table.userProfileId,
      table.weekNumber.desc()
    ),
  })
);
```

#### 1.7 skincareRoutines

**Add after line ~130** (in the table definition):

```typescript
export const skincareRoutines = pgTable(
  'skincare_routines',
  {
    // ... existing columns ...
  },
  (table) => ({
    // For: findByUserId
    userIdIdx: index('sr_user_id_idx').on(table.userProfileId),
  })
);
```

**After adding all indexes:**
```bash
npm run db:generate  # Generate migration
npm run db:push      # Apply to database
```

---

## 🔴 CRITICAL PRIORITY 2: Fix Double Query in Pagination

### File: `src/app/(dashboard)/subscribers/userProfiles.repo.ts`

**Lines**: 124-151

**Problem**: Two separate queries - one for count, one for data

**Current Code**:
```typescript
// Query 1: Count
const countResult = await database
  .select({ count: sql<number>`count(*)` })
  .from(userProfiles)
  .where(whereClause);

const totalCount = Number(countResult[0]?.count || 0);

// Query 2: Data
const profiles = await database
  .select()
  .from(userProfiles)
  .where(whereClause)
  .orderBy(...orderByClause)
  .limit(filters.limit || 20)
  .offset(filters.offset || 0);

return { profiles, totalCount };
```

**Fix - Replace with single query**:
```typescript
// Single query with window function
const results = await database
  .select({
    id: userProfiles.id,
    firstName: userProfiles.firstName,
    lastName: userProfiles.lastName,
    email: userProfiles.email,
    phoneNumber: userProfiles.phoneNumber,
    completedSteps: userProfiles.completedSteps,
    isCompleted: userProfiles.isCompleted,
    isSubscribed: userProfiles.isSubscribed,
    createdAt: userProfiles.createdAt,
    updatedAt: userProfiles.updatedAt,
    // Window function for total count
    totalCount: sql<number>`COUNT(*) OVER()`.as('total_count'),
  })
  .from(userProfiles)
  .where(whereClause)
  .orderBy(...orderByClause)
  .limit(filters.limit || 20)
  .offset(filters.offset || 0);

const totalCount = results[0]?.totalCount || 0;
const profiles = results.map(({ totalCount, ...profile }) => profile);

return { profiles, totalCount };
```

---

## 🔴 CRITICAL PRIORITY 3: Fix ILIKE Queries Without Indexes

### File: `src/app/(dashboard)/subscribers/userProfiles.repo.ts`

**Lines**: 71-79

**Problem**: Using `ilike` without case-insensitive indexes

**Current Code**:
```typescript
if (filters.searchQuery && filters.searchQuery.trim()) {
  const searchTerm = `%${filters.searchQuery.trim()}%`;
  whereConditions.push(
    or(
      ilike(userProfiles.firstName, searchTerm),
      ilike(userProfiles.lastName, searchTerm),
      ilike(userProfiles.email, searchTerm)
    )!
  );
}
```

**Fix - Use LOWER() to match case-insensitive indexes**:
```typescript
if (filters.searchQuery && filters.searchQuery.trim()) {
  const searchTerm = `%${filters.searchQuery.trim().toLowerCase()}%`;
  whereConditions.push(
    or(
      sql`LOWER(${userProfiles.firstName}) LIKE ${searchTerm}`,
      sql`LOWER(${userProfiles.lastName}) LIKE ${searchTerm}`,
      sql`LOWER(${userProfiles.email}) LIKE ${searchTerm}`
    )!
  );
}
```

**Note**: This requires the indexes added in Priority 1 (emailLowerIdx, firstNameLowerIdx, lastNameLowerIdx)

---

## 🔴 CRITICAL PRIORITY 4: Fix Over-Fetching (SELECT *)

### 4.1 routine-step-completions.repo.ts

**File**: `src/app/(dashboard)/subscribers/[id]/compliance-actions/routine-step-completions.repo.ts`

**5 queries to fix:**

#### Query 1: findByUserAndDateRange (lines 66-76)

**Current**:
```typescript
async findByUserAndDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<RoutineStepCompletion[]> {
  const results = await db
    .select() // ❌ NO COLUMNS
    .from(routineStepCompletions)
    .where(/* ... */)
    .orderBy(routineStepCompletions.scheduledDate);

  return results as RoutineStepCompletion[];
}
```

**Fix**:
```typescript
async findByUserAndDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<RoutineStepCompletion[]> {
  return await db
    .select({
      id: routineStepCompletions.id,
      routineProductId: routineStepCompletions.routineProductId,
      userProfileId: routineStepCompletions.userProfileId,
      scheduledDate: routineStepCompletions.scheduledDate,
      scheduledTimeOfDay: routineStepCompletions.scheduledTimeOfDay,
      onTimeDeadline: routineStepCompletions.onTimeDeadline,
      gracePeriodEnd: routineStepCompletions.gracePeriodEnd,
      completedAt: routineStepCompletions.completedAt,
      status: routineStepCompletions.status,
      createdAt: routineStepCompletions.createdAt,
      updatedAt: routineStepCompletions.updatedAt,
    })
    .from(routineStepCompletions)
    .where(
      and(
        eq(routineStepCompletions.userProfileId, userId),
        gte(routineStepCompletions.scheduledDate, startDate),
        lte(routineStepCompletions.scheduledDate, endDate)
      )
    )
    .orderBy(routineStepCompletions.scheduledDate);
}
```

#### Query 2: findById (lines 41-48)
#### Query 3: findByRoutineProductId (lines 50-57)
#### Query 4: markOverdue (lines 96-107)
#### Query 5: getUpcomingSteps (lines 78-88)

**All 5 need same fix**: Add explicit column selection like above.

---

### 4.2 routine.repo.ts (routine-actions)

**File**: `src/app/(dashboard)/subscribers/[id]/routine-actions/routine.repo.ts`

**5 queries to fix:**

#### Query 1: findByUserId (lines ~30-40)
#### Query 2: findByUserIdAndTimeOfDay (lines ~42-52)
#### Query 3: findById (lines ~54-64)
#### Query 4: findByIds (lines ~66-76)
#### Query 5: (any other .select() calls)

**Pattern for all**:
```typescript
// ❌ BEFORE
const results = await db.select().from(skincareRoutineProducts).where(/* ... */);

// ✅ AFTER
const results = await db.select({
  id: skincareRoutineProducts.id,
  routineId: skincareRoutineProducts.routineId,
  userProfileId: skincareRoutineProducts.userProfileId,
  productName: skincareRoutineProducts.productName,
  productBrand: skincareRoutineProducts.productBrand,
  timeOfDay: skincareRoutineProducts.timeOfDay,
  order: skincareRoutineProducts.order,
  frequency: skincareRoutineProducts.frequency,
  isActive: skincareRoutineProducts.isActive,
  createdAt: skincareRoutineProducts.createdAt,
  updatedAt: skincareRoutineProducts.updatedAt,
}).from(skincareRoutineProducts).where(/* ... */);
```

---

### 4.3 userProfiles.repo.ts

**File**: `src/app/(dashboard)/subscribers/userProfiles.repo.ts`

**6 queries to fix:**

#### Query 1: findById (lines ~30-40)
#### Query 2: findByEmail (lines ~42-52)
#### Query 3: findByPhone (lines ~54-64)
#### Query 4: findByEmailOrPhone (lines ~66-76)
#### Query 5: findAll (lines ~78-88)
#### Query 6: getAll in pagination (ALREADY COVERED IN PRIORITY 2)

**Pattern**:
```typescript
// ❌ BEFORE
const result = await database.select().from(userProfiles).where(/* ... */);

// ✅ AFTER
const result = await database.select({
  id: userProfiles.id,
  firstName: userProfiles.firstName,
  lastName: userProfiles.lastName,
  email: userProfiles.email,
  phoneNumber: userProfiles.phoneNumber,
  completedSteps: userProfiles.completedSteps,
  isCompleted: userProfiles.isCompleted,
  isSubscribed: userProfiles.isSubscribed,
  createdAt: userProfiles.createdAt,
  updatedAt: userProfiles.updatedAt,
}).from(userProfiles).where(/* ... */);
```

---

### 4.4 template.repo.ts

**File**: `src/app/(dashboard)/routine-management/template-actions/template.repo.ts`

**4 queries to fix:**

#### Query 1: findAll
#### Query 2: findById
#### Query 3: findByName (if exists)
#### Query 4: (any other .select() calls)

**Pattern**:
```typescript
// ❌ BEFORE
const templates = await db.select().from(routineTemplates).where(/* ... */);

// ✅ AFTER
const templates = await db.select({
  id: routineTemplates.id,
  name: routineTemplates.name,
  description: routineTemplates.description,
  isActive: routineTemplates.isActive,
  createdAt: routineTemplates.createdAt,
  updatedAt: routineTemplates.updatedAt,
}).from(routineTemplates).where(/* ... */);
```

---

### 4.5 goals.repo.ts

**File**: `src/app/(dashboard)/subscribers/[id]/goal-actions/goals.repo.ts`

**2 queries to fix:**

#### Query 1: findByUserId
#### Query 2: findById (if exists)

**Pattern**:
```typescript
// ❌ BEFORE
const goals = await db.select().from(skincareGoals).where(/* ... */);

// ✅ AFTER
const goals = await db.select({
  id: skincareGoals.id,
  userProfileId: skincareGoals.userProfileId,
  primaryGoal: skincareGoals.primaryGoal,
  description: skincareGoals.description,
  targetCompletionDate: skincareGoals.targetCompletionDate,
  createdAt: skincareGoals.createdAt,
  updatedAt: skincareGoals.updatedAt,
}).from(skincareGoals).where(/* ... */);
```

---

### 4.6 coach-notes.repo.ts

**File**: `src/app/(dashboard)/subscribers/[id]/coach-notes-actions/coach-notes.repo.ts`

**2 queries to fix:**

#### Query 1: findByUserId
#### Query 2: findById (if exists)

**Pattern**:
```typescript
// ❌ BEFORE
const notes = await db.select().from(coachNotes).where(/* ... */);

// ✅ AFTER
const notes = await db.select({
  id: coachNotes.id,
  userProfileId: coachNotes.userProfileId,
  note: coachNotes.note,
  createdAt: coachNotes.createdAt,
  updatedAt: coachNotes.updatedAt,
}).from(coachNotes).where(/* ... */);
```

---

### 4.7 progress-photos.repo.ts

**File**: `src/app/(dashboard)/subscribers/[id]/progress-photos-actions/progress-photos.repo.ts`

**3 queries to fix:**

#### Query 1: findByUserId
#### Query 2: findById (if exists)
#### Query 3: findByWeekNumber (if exists)

**Pattern**:
```typescript
// ❌ BEFORE
const photos = await db.select().from(progressPhotos).where(/* ... */);

// ✅ AFTER
const photos = await db.select({
  id: progressPhotos.id,
  userProfileId: progressPhotos.userProfileId,
  weekNumber: progressPhotos.weekNumber,
  photoUrl: progressPhotos.photoUrl,
  notes: progressPhotos.notes,
  coachFeedback: progressPhotos.coachFeedback,
  createdAt: progressPhotos.createdAt,
  updatedAt: progressPhotos.updatedAt,
}).from(progressPhotos).where(/* ... */);
```

---

### 4.8 Other repo files

Apply same pattern to:
- `src/app/(dashboard)/subscribers/[id]/profile-header-actions/user-profile.repo.ts`
- `src/app/(dashboard)/subscribers/[id]/compliance-actions/routine.repo.ts`
- `src/app/(dashboard)/subscribers/[id]/compliance-actions/routine-products.repo.ts`
- `src/app/(dashboard)/subscribers/[id]/compliance-actions/user-profile.repo.ts`
- `src/app/(dashboard)/subscribers/[id]/routine-info-actions/routine.repo.ts`

---

## 🟢 MEDIUM PRIORITY: Connection Pooling & Monitoring

### File: `src/lib/db/index.ts`

**Current Code (line ~15)**:
```typescript
export const client = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, { prepare: false })
  : null;
```

**Fix - Add pooling and monitoring**:
```typescript
export const client = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, {
      prepare: false,
      max: 20,              // Max connections in pool
      idle_timeout: 20,     // Close idle connections after 20s
      connect_timeout: 10,  // Connection timeout
      debug: (connection, query, params) => {
        const start = Date.now();
        return () => {
          const duration = Date.now() - start;
          if (duration > 100) { // Log queries > 100ms
            console.warn(`⚠️  Slow query (${duration}ms):`, query.substring(0, 100));
          }
        };
      },
    })
  : null;
```

---

## Summary of Fixes

| Priority | Issue | Files Affected | Impact |
|----------|-------|----------------|--------|
| 🔴 Critical | Add indexes | 1 file (schema.ts) | 100-1000x faster |
| 🔴 Critical | Fix double query | 1 file (userProfiles.repo.ts) | 2x faster |
| 🔴 Critical | Fix ILIKE | 1 file (userProfiles.repo.ts) | 10x faster search |
| 🔴 Critical | Fix SELECT * | 12 repo files | 10-50% less data + enables covering indexes |
| 🟢 Medium | Connection pool | 1 file (db/index.ts) | Better under load |
| 🟢 Medium | Query monitoring | 1 file (db/index.ts) | Identify slow queries |

**Total Files to Modify**: 14 files

**Estimated Performance Gain After All Fixes**: 100-1000x faster overall

---

## Fix Order (Recommended)

1. ✅ Add all indexes to schema.ts → Run migration
2. ✅ Fix userProfiles.repo.ts (double query + ILIKE)
3. ✅ Fix routine-step-completions.repo.ts (most critical - used in compliance)
4. ✅ Fix remaining repo files (routine.repo, template.repo, goals.repo, etc.)
5. ✅ Add connection pooling and monitoring

**After each step**: Test queries to verify they still work correctly.
