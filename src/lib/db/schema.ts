import { pgTable, text, timestamp, boolean, uuid, varchar, date, uniqueIndex } from 'drizzle-orm/pg-core';
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

// Type exports for TypeScript
export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type NewVerificationCode = typeof verificationCodes.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
