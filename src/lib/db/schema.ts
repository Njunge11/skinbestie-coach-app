import { pgTable, text, timestamp, boolean, uuid, varchar, date, uniqueIndex, index, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const admins = pgTable('admins', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash'),
  passwordSet: boolean('password_set').notNull().default(false),
  role: text('role').notNull().default('admin'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verificationCodes = pgTable('verification_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminId: uuid('admin_id')
    .notNull()
    .references(() => admins.id, { onDelete: 'cascade' }),
  codeHash: text('code_hash').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').notNull().default(false),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const userProfiles = pgTable(
  'user_profiles',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Step 1 - Always required
    firstName: varchar('first_name', { length: 120 }).notNull(),
    lastName: varchar('last_name', { length: 120 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phoneNumber: varchar('phone_number', { length: 32 }).notNull(),
    dateOfBirth: date('date_of_birth', { mode: 'date' }).notNull(),

    // Step 2 - Nullable until completed
    skinType: text('skin_type').array().$type<string[]>(),

    // Step 3 - Nullable until completed
    concerns: text('concerns').array().$type<string[]>(),

    // Step 4 - Nullable until completed
    hasAllergies: boolean('has_allergies'),
    allergyDetails: text('allergy_details'),

    // Step 5 - Nullable until completed
    isSubscribed: boolean('is_subscribed'),

    // Step 6 - Nullable until completed
    hasCompletedBooking: boolean('has_completed_booking'),

    // Additional profile fields
    occupation: text('occupation'),
    bio: text('bio'),

    // Tracking fields
    completedSteps: text('completed_steps')
      .array()
      .$type<string[]>()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    isCompleted: boolean('is_completed').notNull().default(false),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex('user_profiles_email_idx').on(table.email),
    phoneIdx: uniqueIndex('user_profiles_phone_idx').on(table.phoneNumber),
  })
);

export const skincareGoals = pgTable(
  'skincare_goals',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Key to user
    userProfileId: uuid('user_profile_id')
      .notNull()
      .references(() => userProfiles.id, { onDelete: 'cascade' }),

    // Goal fields (all required)
    name: text('name').notNull(),
    description: text('description').notNull(),
    timeframe: text('timeframe').notNull(),

    // Status
    complete: boolean('complete').notNull().default(false),

    // Ordering/Priority (for drag-and-drop reordering)
    order: integer('order').notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Index for efficient queries by user
    userProfileIdx: index('skincare_goals_user_profile_idx').on(table.userProfileId),

    // Unique constraint to prevent duplicate order values per user
    uniqueOrderPerUser: uniqueIndex('skincare_goals_user_order_idx').on(
      table.userProfileId,
      table.order
    ),
  })
);

export const skincareRoutineProducts = pgTable(
  'skincare_routine_products',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Key to user
    userProfileId: uuid('user_profile_id')
      .notNull()
      .references(() => userProfiles.id, { onDelete: 'cascade' }),

    // Product details (all required except productUrl)
    routineStep: text('routine_step').notNull(),
    productName: text('product_name').notNull(),
    productUrl: text('product_url'), // Optional link to product
    instructions: text('instructions').notNull(),

    // Frequency and scheduling
    frequency: text('frequency').notNull(), // "Daily", "2x per week", "3x per week"
    days: text('days').array().$type<string[]>(), // ["Monday", "Wednesday"] for non-daily

    // Timing and ordering
    timeOfDay: text('time_of_day').notNull(), // "morning" or "evening"
    order: integer('order').notNull(), // Sequence within the time of day

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Index for efficient queries by user
    userProfileIdx: index('skincare_routine_products_user_profile_idx').on(table.userProfileId),

    // Unique constraint to prevent duplicate order values per user per time of day
    uniqueOrderPerUserAndTime: uniqueIndex('skincare_routine_products_user_time_order_idx').on(
      table.userProfileId,
      table.timeOfDay,
      table.order
    ),
  })
);

export const coachNotes = pgTable(
  'coach_notes',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    userProfileId: uuid('user_profile_id')
      .notNull()
      .references(() => userProfiles.id, { onDelete: 'cascade' }),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => admins.id, { onDelete: 'cascade' }),

    // Note content
    content: text('content').notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Index for efficient queries by user profile
    userProfileIdx: index('coach_notes_user_profile_idx').on(table.userProfileId),
    // Index for efficient queries by admin
    adminIdx: index('coach_notes_admin_idx').on(table.adminId),
  })
);

// Type exports for TypeScript
export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type NewVerificationCode = typeof verificationCodes.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type SkincareGoal = typeof skincareGoals.$inferSelect;
export type NewSkincareGoal = typeof skincareGoals.$inferInsert;
export type SkincareRoutineProduct = typeof skincareRoutineProducts.$inferSelect;
export type NewSkincareRoutineProduct = typeof skincareRoutineProducts.$inferInsert;
export type CoachNote = typeof coachNotes.$inferSelect;
export type NewCoachNote = typeof coachNotes.$inferInsert;
