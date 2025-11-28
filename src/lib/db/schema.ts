import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  varchar,
  date,
  uniqueIndex,
  index,
  integer,
  pgEnum,
  primaryKey,
  jsonb,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// PostgreSQL Enums for type safety
export const adminRoleEnum = pgEnum("admin_role", ["admin", "superadmin"]);
export const routineStatusEnum = pgEnum("routine_status", [
  "draft",
  "published",
]);
export const frequencyEnum = pgEnum("frequency", [
  "daily",
  "1x per week",
  "2x per week",
  "3x per week",
  "4x per week",
  "5x per week",
  "6x per week",
  "specific_days",
]);
export const timeOfDayEnum = pgEnum("time_of_day", ["morning", "evening"]);
export const stepTypeEnum = pgEnum("step_type", [
  "instruction_only",
  "product",
]);
export const completionStatusEnum = pgEnum("completion_status", [
  "pending",
  "on-time",
  "late",
  "missed",
]);
export const goalTemplateStatusEnum = pgEnum("goal_template_status", [
  "published",
  "unpublished",
]);
export const goalPriorityEnum = pgEnum("goal_priority", [
  "none",
  "low",
  "medium",
  "high",
]);
export const questionTypeEnum = pgEnum("question_type", ["yes_no", "freehand"]);
export const surveyStatusEnum = pgEnum("survey_status", [
  "draft",
  "published",
  "archived",
]);

// ============================================
// NextAuth.js Tables (for email magic link authentication)
// ============================================

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  }),
);

// ============================================
// Admin Tables
// ============================================

export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  passwordSet: boolean("password_set").notNull().default(false),
  role: adminRoleEnum("role").notNull().default("admin"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verificationCodes = pgTable(
  "verification_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => admins.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    used: boolean("used").notNull().default(false),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    // Index for efficient queries by admin
    adminIdx: index("verification_codes_admin_idx").on(table.adminId),
  }),
);

export const userVerificationCodes = pgTable(
  "user_verification_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    used: boolean("used").notNull().default(false),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    // Index for efficient queries by user
    userIdx: index("user_verification_codes_user_idx").on(table.userId),
  }),
);

export const userProfiles = pgTable(
  "user_profiles",
  {
    // Primary Key
    id: uuid("id").primaryKey().defaultRandom(),

    // Foreign Key to auth user (1:1 mapping)
    userId: text("user_id")
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),

    // Step 1 - Always required
    firstName: varchar("first_name", { length: 120 }).notNull(),
    lastName: varchar("last_name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phoneNumber: varchar("phone_number", { length: 32 }).notNull(),
    dateOfBirth: date("date_of_birth", { mode: "date" }).notNull(),

    // Step 2 - Nullable until completed
    skinType: text("skin_type").array().$type<string[]>(),

    // Step 3 - Nullable until completed
    concerns: text("concerns").array().$type<string[]>(),

    // Step 4 - Nullable until completed
    hasAllergies: boolean("has_allergies"),
    allergyDetails: text("allergy_details"),

    // Step 5 - Nullable until completed
    isSubscribed: boolean("is_subscribed"),

    // Step 6 - Nullable until completed
    hasCompletedBooking: boolean("has_completed_booking"),

    // Skin test completion tracking
    hasCompletedSkinTest: boolean("has_completed_skin_test"),

    // Products received tracking
    productsReceived: boolean("products_received").notNull().default(false),

    // Routine start date set tracking
    routineStartDateSet: boolean("routine_start_date_set")
      .notNull()
      .default(false),

    // Feedback survey visibility (controlled by coach)
    feedbackSurveyVisible: boolean("feedback_survey_visible")
      .notNull()
      .default(false),

    // Additional profile fields
    nickname: text("nickname"),
    occupation: text("occupation"),
    bio: text("bio"),

    // Timezone for compliance tracking
    timezone: text("timezone").notNull().default("Europe/London"), // IANA timezone

    // Tracking fields
    completedSteps: text("completed_steps")
      .array()
      .$type<string[]>()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    isCompleted: boolean("is_completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("user_profiles_email_idx").on(table.email),
    phoneIdx: uniqueIndex("user_profiles_phone_idx").on(table.phoneNumber),
    // Index for name-based searches and sorting
    nameIdx: index("user_profiles_name_idx").on(
      table.firstName,
      table.lastName,
    ),
  }),
);

export const skinGoalsTemplate = pgTable(
  "skin_goals_template",
  {
    // Primary Key
    id: uuid("id").primaryKey().defaultRandom(),

    // Foreign Key to user (one template per user)
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => userProfiles.id, { onDelete: "cascade" }),

    // Status
    status: goalTemplateStatusEnum("status").notNull().default("unpublished"),

    // Client acknowledgement
    goalsAcknowledgedByClient: boolean("goals_acknowledged_by_client")
      .notNull()
      .default(false),

    // Admin tracking
    createdBy: uuid("created_by")
      .notNull()
      .references(() => admins.id, { onDelete: "restrict" }),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => admins.id, { onDelete: "restrict" }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Unique index for user_id (enforces one template per user)
    userIdIdx: uniqueIndex("skin_goals_template_user_id_idx").on(table.userId),
    // Index for filtering by status
    statusIdx: index("skin_goals_template_status_idx").on(table.status),
    // Index for tracking who created templates
    createdByIdx: index("skin_goals_template_created_by_idx").on(
      table.createdBy,
    ),
  }),
);

export const skincareGoals = pgTable(
  "skincare_goals",
  {
    // Primary Key
    id: uuid("id").primaryKey().defaultRandom(),

    // Foreign Key to template
    templateId: uuid("template_id")
      .notNull()
      .references(() => skinGoalsTemplate.id, { onDelete: "cascade" }),

    // Goal content - only description now
    description: text("description").notNull(),

    // Timeline for goal completion (e.g., "2-4 weeks", "3 months")
    timeline: text("timeline"),

    // Primary goal flag - only one goal per user can be primary
    isPrimaryGoal: boolean("is_primary_goal").notNull().default(false),

    // Completion tracking
    complete: boolean("complete").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    // Ordering/Priority (for drag-and-drop reordering)
    order: integer("order").notNull(),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Index for efficient queries by template
    templateIdx: index("skincare_goals_template_idx").on(table.templateId),
    // Index for ordering/drag-drop operations
    orderIdx: index("skincare_goals_order_idx").on(table.order),
    // Note: Unique constraint on (templateId, order) is handled by a deferrable constraint
    // created via custom migration 0021_fix-goals-deferrable-constraint.sql
    // This allows for atomic reordering operations within transactions
  }),
);

export const skincareRoutines = pgTable(
  "skincare_routines",
  {
    // Primary Key
    id: uuid("id").primaryKey().defaultRandom(),

    // Foreign Key to user
    userProfileId: uuid("user_profile_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),

    // Routine details
    name: text("name").notNull(),
    startDate: date("start_date", { mode: "date" }).notNull(),
    endDate: date("end_date", { mode: "date" }), // Optional - null means ongoing
    status: routineStatusEnum("status").notNull().default("draft"), // "draft" or "published"
    productPurchaseInstructions: text("product_purchase_instructions"), // Optional instructions for purchasing products

    // Template tracking
    savedAsTemplate: boolean("saved_as_template").notNull().default(false), // Track if routine was saved as template

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Index for efficient queries by user
    userProfileIdx: index("skincare_routines_user_profile_idx").on(
      table.userProfileId,
    ),
    // Index for filtering by status (draft vs published)
    statusIdx: index("skincare_routines_status_idx").on(table.status),
  }),
);

export const skincareRoutineProducts = pgTable(
  "skincare_routine_products",
  {
    // Primary Key
    id: uuid("id").primaryKey().defaultRandom(),

    // Foreign Keys
    routineId: uuid("routine_id")
      .notNull()
      .references(() => skincareRoutines.id, { onDelete: "cascade" }),
    userProfileId: uuid("user_profile_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),

    // Step type (determines which fields are required)
    stepType: stepTypeEnum("step_type").notNull().default("product"), // "instruction_only" or "product"

    // Step name (optional for "instruction_only" type only)
    stepName: text("step_name"), // Optional name for instruction-only steps

    // Product details (required fields depend on stepType)
    routineStep: text("routine_step"), // Required for "product", optional for "instruction_only"
    productName: text("product_name"), // Required for "product", null for "instruction_only"
    productUrl: text("product_url"), // Optional for "product", null for "instruction_only"
    instructions: text("instructions"), // Required for "instruction_only", optional for "product"
    productPurchaseInstructions: text("product_purchase_instructions"), // Optional for "product", null for "instruction_only"

    // Frequency and scheduling (always required)
    frequency: frequencyEnum("frequency").notNull(), // "daily", "2x per week", "3x per week", "specific_days"
    days: text("days").array().$type<string[]>(), // ["Monday", "Wednesday"] for non-daily

    // Timing and ordering
    timeOfDay: timeOfDayEnum("time_of_day").notNull(), // "morning" or "evening"
    order: integer("order").notNull(), // Sequence within the time of day

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Index for efficient queries by routine
    routineIdx: index("skincare_routine_products_routine_idx").on(
      table.routineId,
    ),
    // Index for efficient queries by user
    userProfileIdx: index("skincare_routine_products_user_profile_idx").on(
      table.userProfileId,
    ),
    // Index for ordering by time of day
    timeOrderIdx: index("skincare_routine_products_time_order_idx").on(
      table.timeOfDay,
      table.order,
    ),

    // Unique constraint to prevent duplicate order values per routine per time of day
    uniqueOrderPerRoutineAndTime: uniqueIndex(
      "skincare_routine_products_routine_time_order_idx",
    ).on(table.routineId, table.timeOfDay, table.order),

    // Check constraints for step type validation
    // When step_type = 'product', routine_step and product_name must not be null
    productStepRequirements: check(
      "product_step_requirements",
      sql`${table.stepType} = 'instruction_only' OR (${table.routineStep} IS NOT NULL AND ${table.productName} IS NOT NULL)`,
    ),
    // When step_type = 'instruction_only', instructions must not be null
    instructionOnlyRequirements: check(
      "instruction_only_requirements",
      sql`${table.stepType} = 'product' OR ${table.instructions} IS NOT NULL`,
    ),
  }),
);

export const routineTemplates = pgTable(
  "routine_templates",
  {
    // Primary Key
    id: uuid("id").primaryKey().defaultRandom(),

    // Template details
    name: text("name").notNull(),
    description: text("description"), // Optional: what this routine is for (e.g., "Acne treatment routine", "Anti-aging routine")

    // Track who created this template
    createdBy: uuid("created_by").references(() => admins.id, {
      onDelete: "set null",
    }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Index for efficient queries by creator
    createdByIdx: index("routine_templates_created_by_idx").on(table.createdBy),
    // Index for searching/filtering templates by name
    nameIdx: index("routine_templates_name_idx").on(table.name),
  }),
);

export const routineTemplateProducts = pgTable(
  "routine_template_products",
  {
    // Primary Key
    id: uuid("id").primaryKey().defaultRandom(),

    // Foreign Key to template
    templateId: uuid("template_id")
      .notNull()
      .references(() => routineTemplates.id, { onDelete: "cascade" }),

    // Step type (determines which fields are required)
    stepType: stepTypeEnum("step_type").notNull().default("product"), // "instruction_only" or "product"

    // Step name (optional for "instruction_only" type only)
    stepName: text("step_name"), // Optional name for instruction-only steps

    // Product details (required fields depend on stepType)
    routineStep: text("routine_step"), // Required for "product", optional for "instruction_only"
    productName: text("product_name"), // Required for "product", null for "instruction_only"
    productUrl: text("product_url"), // Optional link to product
    instructions: text("instructions"), // Optional usage instructions for "product", required for "instruction_only"
    productPurchaseInstructions: text("product_purchase_instructions"), // Optional purchase instructions

    // Frequency and scheduling
    frequency: frequencyEnum("frequency").notNull(), // "daily", "2x per week", "3x per week", "specific_days"
    days: text("days").array().$type<string[]>(), // ["Monday", "Wednesday"] for non-daily

    // Timing and ordering
    timeOfDay: timeOfDayEnum("time_of_day").notNull(), // "morning" or "evening"
    order: integer("order").notNull(), // Sequence within the time of day

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Index for efficient queries by template
    templateIdx: index("routine_template_products_template_idx").on(
      table.templateId,
    ),
    // Index for ordering/drag-drop operations
    orderIdx: index("routine_template_products_order_idx").on(table.order),

    // Unique constraint to prevent duplicate order values per template per time of day
    uniqueOrderPerTemplateAndTime: uniqueIndex(
      "routine_template_products_template_time_order_idx",
    ).on(table.templateId, table.timeOfDay, table.order),
  }),
);

export const coachNotes = pgTable(
  "coach_notes",
  {
    // Primary Key
    id: uuid("id").primaryKey().defaultRandom(),

    // Foreign Keys
    userProfileId: uuid("user_profile_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => admins.id, { onDelete: "cascade" }),

    // Note content
    content: text("content").notNull(),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Index for efficient queries by user profile
    userProfileIdx: index("coach_notes_user_profile_idx").on(
      table.userProfileId,
    ),
    // Index for efficient queries by admin
    adminIdx: index("coach_notes_admin_idx").on(table.adminId),
    // Composite index for user profile + created_at DESC (optimized for ORDER BY query)
    byUserCreatedAt: index("coach_notes_user_profile_id_created_at_idx").on(
      table.userProfileId,
      table.createdAt.desc(),
    ),
  }),
);

export const progressPhotos = pgTable(
  "progress_photos",
  {
    // Primary Key
    id: uuid("id").primaryKey().defaultRandom(),

    // Foreign Key to user
    userProfileId: uuid("user_profile_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),

    // Image storage
    imageUrl: text("image_url").notNull(),

    // S3 storage details (nullable for backwards compatibility)
    s3Key: text("s3_key"),
    s3Bucket: text("s3_bucket"),

    // File metadata
    originalName: text("original_name"),
    bytes: integer("bytes"),
    mime: text("mime"),
    width: integer("width"),
    height: integer("height"),

    // Metadata
    weekNumber: integer("week_number"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Coach feedback
    feedback: text("feedback"), // Nullable - can be added later

    // Upload status
    status: text("status").notNull().default("uploaded"),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Index for efficient queries by user
    userProfileIdx: index("progress_photos_user_profile_idx").on(
      table.userProfileId,
    ),

    // Index for chronological ordering
    uploadedAtIdx: index("progress_photos_uploaded_at_idx").on(
      table.uploadedAt,
    ),

    // Composite index for user + week queries
    userWeekIdx: index("progress_photos_user_week_idx").on(
      table.userProfileId,
      table.weekNumber,
    ),

    // Composite index for user profile + uploaded_at DESC (optimized for ORDER BY query)
    byUserUploadedAt: index(
      "progress_photos_user_profile_id_uploaded_at_idx",
    ).on(table.userProfileId, table.uploadedAt.desc()),

    // Index for S3 key lookups
    s3KeyIdx: index("progress_photos_s3_key_idx").on(table.s3Key),

    // Index for status filtering
    statusIdx: index("progress_photos_status_idx").on(table.status),
  }),
);

export const routineStepCompletions = pgTable(
  "routine_step_completions",
  {
    // Primary Key
    id: uuid("id").primaryKey().defaultRandom(),

    // Foreign Keys
    routineProductId: uuid("routine_product_id")
      .notNull()
      .references(() => skincareRoutineProducts.id, { onDelete: "cascade" }),
    userProfileId: uuid("user_profile_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),

    // Scheduling information
    scheduledDate: date("scheduled_date", { mode: "date" }).notNull(),
    scheduledTimeOfDay: timeOfDayEnum("scheduled_time_of_day").notNull(), // 'morning' | 'evening'

    // Precomputed deadlines (makes queries fast and simple)
    // These are calculated based on scheduledDate + user's timezone
    onTimeDeadline: timestamp("on_time_deadline", {
      withTimezone: true,
    }).notNull(),
    gracePeriodEnd: timestamp("grace_period_end", {
      withTimezone: true,
    }).notNull(),

    // Completion information
    completedAt: timestamp("completed_at", { withTimezone: true }), // null = not completed yet
    status: completionStatusEnum("status").notNull().default("pending"), // 'pending' | 'on-time' | 'late' | 'missed'

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Index for efficient queries by user
    userProfileIdx: index("routine_step_completions_user_idx").on(
      table.userProfileId,
    ),

    // Index for efficient queries by routine product
    routineProductIdx: index("routine_step_completions_product_idx").on(
      table.routineProductId,
    ),

    // Index for date-based queries
    scheduledDateIdx: index("routine_step_completions_date_idx").on(
      table.scheduledDate,
    ),

    // Composite index for getting user's daily routine
    userDateIdx: index("routine_step_completions_user_date_idx").on(
      table.userProfileId,
      table.scheduledDate,
    ),

    // Composite index for lazy marking missed steps
    statusGracePeriodIdx: index("routine_step_completions_status_grace_idx").on(
      table.status,
      table.gracePeriodEnd,
    ),

    // Composite index for compliance date range queries
    userDateRangeIdx: index("routine_step_completions_user_date_range_idx").on(
      table.userProfileId,
      table.scheduledDate,
      table.status,
    ),

    // Prevent duplicate scheduled steps for same product on same date
    uniqueSchedule: uniqueIndex("routine_step_completions_unique_schedule").on(
      table.routineProductId,
      table.scheduledDate,
    ),
  }),
);

export const surveys = pgTable(
  "surveys",
  {
    // Primary Key
    id: uuid("id").primaryKey().defaultRandom(),

    // Survey details
    title: text("title").notNull(), // e.g., "Week 4 Progress Check-in"
    description: text("description"), // Optional intro text shown to users

    // Status
    status: surveyStatusEnum("status").notNull().default("draft"),

    // Admin tracking
    createdBy: uuid("created_by")
      .notNull()
      .references(() => admins.id, { onDelete: "restrict" }),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => admins.id, { onDelete: "restrict" }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Index for filtering by status
    statusIdx: index("surveys_status_idx").on(table.status),
    // Index for tracking who created surveys
    createdByIdx: index("surveys_created_by_idx").on(table.createdBy),
  }),
);

export const surveyQuestions = pgTable(
  "survey_questions",
  {
    // Primary Key
    id: uuid("id").primaryKey().defaultRandom(),

    // Foreign Key to survey
    surveyId: uuid("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),

    // Question details
    questionText: text("question_text").notNull(), // e.g., "Are you seeing improvements?"
    questionType: questionTypeEnum("question_type").notNull(), // "yes_no" or "freehand"

    // Optional helper text (shown below question)
    helperText: text("helper_text"), // e.g., "Please describe any changes you've noticed"

    // Required flag
    isRequired: boolean("is_required").notNull().default(true),

    // Ordering (for display sequence)
    order: integer("order").notNull(),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Index for efficient queries by survey
    surveyIdx: index("survey_questions_survey_idx").on(table.surveyId),
    // Index for ordering
    orderIdx: index("survey_questions_order_idx").on(table.order),
    // Unique constraint to prevent duplicate order values per survey
    uniqueOrderPerSurvey: uniqueIndex("survey_questions_survey_order_idx").on(
      table.surveyId,
      table.order,
    ),
  }),
);

export const surveySubmissions = pgTable(
  "survey_submissions",
  {
    // Primary Key
    id: uuid("id").primaryKey().defaultRandom(),

    // Foreign Keys
    surveyId: uuid("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    userProfileId: uuid("user_profile_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),

    // Submission metadata
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Index for efficient queries by survey
    surveyIdx: index("survey_submissions_survey_idx").on(table.surveyId),
    // Index for efficient queries by user
    userProfileIdx: index("survey_submissions_user_idx").on(
      table.userProfileId,
    ),
    // Composite index for user + survey history
    userSurveyIdx: index("survey_submissions_user_survey_idx").on(
      table.userProfileId,
      table.surveyId,
    ),
    // Index for chronological ordering
    submittedAtIdx: index("survey_submissions_submitted_at_idx").on(
      table.submittedAt,
    ),
  }),
);

export const surveyResponses = pgTable(
  "survey_responses",
  {
    // Primary Key
    id: uuid("id").primaryKey().defaultRandom(),

    // Foreign Keys
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => surveySubmissions.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => surveyQuestions.id, { onDelete: "cascade" }),
    userProfileId: uuid("user_profile_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),

    // Response data (polymorphic - depends on question type)
    yesNoAnswer: boolean("yes_no_answer"), // Used for yes_no questions
    freehandAnswer: text("freehand_answer"), // Used for freehand questions

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Index for efficient queries by submission
    submissionIdx: index("survey_responses_submission_idx").on(
      table.submissionId,
    ),
    // Index for efficient queries by user
    userProfileIdx: index("survey_responses_user_idx").on(table.userProfileId),
    // Index for efficient queries by question
    questionIdx: index("survey_responses_question_idx").on(table.questionId),
    // Unique constraint: one response per submission per question
    uniqueSubmissionQuestion: uniqueIndex(
      "survey_responses_submission_question_idx",
    ).on(table.submissionId, table.questionId),
  }),
);

// ============================================
// Journal Tables
// ============================================

export const journals = pgTable(
  "journals",
  {
    // Primary Key
    id: uuid("id").primaryKey().defaultRandom(),

    // Foreign Key to user profile
    userProfileId: uuid("user_profile_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),

    // Content Fields
    title: text("title").notNull().default("Untitled Journal Entry"),
    content: jsonb("content").$type<object>().notNull().default(sql`'{
      "root": {
        "children": [],
        "direction": "ltr",
        "format": "",
        "indent": 0,
        "type": "root",
        "version": 1
      }
    }'::jsonb`), // Lexical Editor JSON format
    public: boolean("public").notNull().default(false),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastModified: timestamp("last_modified", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Index for efficient queries by user profile
    userProfileIdx: index("journals_user_profile_idx").on(table.userProfileId),
    // Index for efficient queries by created date (DESC for newest first)
    createdAtIdx: index("journals_created_at_idx").on(
      table.userProfileId,
      table.createdAt,
    ),
    // Index for efficient queries by last modified date
    lastModifiedIdx: index("journals_last_modified_idx").on(table.lastModified),
  }),
);

export const profileTags = pgTable(
  "profile_tags",
  {
    // Primary Key
    id: uuid("id").primaryKey().defaultRandom(),

    // Foreign Key to user profile
    userProfileId: uuid("user_profile_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),

    // Tag content (max 100 chars - reasonable for "Allergic to fragrance", etc.)
    tag: varchar("tag", { length: 100 }).notNull(),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Index for efficient queries by user profile
    userProfileIdx: index("profile_tags_user_profile_idx").on(
      table.userProfileId,
    ),
    // Index for tag searches/filtering
    tagIdx: index("profile_tags_tag_idx").on(table.tag),
    // Prevent duplicate tags per user (case-sensitive at DB level)
    uniqueUserTag: uniqueIndex("profile_tags_user_tag_idx").on(
      table.userProfileId,
      table.tag,
    ),
  }),
);

// Type exports for TypeScript

// NextAuth types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

// Admin types
export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type NewVerificationCode = typeof verificationCodes.$inferInsert;
export type UserVerificationCode = typeof userVerificationCodes.$inferSelect;
export type NewUserVerificationCode = typeof userVerificationCodes.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type SkinGoalsTemplate = typeof skinGoalsTemplate.$inferSelect;
export type NewSkinGoalsTemplate = typeof skinGoalsTemplate.$inferInsert;
export type SkincareGoal = typeof skincareGoals.$inferSelect;
export type NewSkincareGoal = typeof skincareGoals.$inferInsert;
export type SkincareRoutine = typeof skincareRoutines.$inferSelect;
export type NewSkincareRoutine = typeof skincareRoutines.$inferInsert;
export type SkincareRoutineProduct =
  typeof skincareRoutineProducts.$inferSelect;
export type NewSkincareRoutineProduct =
  typeof skincareRoutineProducts.$inferInsert;
export type RoutineTemplate = typeof routineTemplates.$inferSelect;
export type NewRoutineTemplate = typeof routineTemplates.$inferInsert;
export type RoutineTemplateProduct =
  typeof routineTemplateProducts.$inferSelect;
export type NewRoutineTemplateProduct =
  typeof routineTemplateProducts.$inferInsert;
export type CoachNote = typeof coachNotes.$inferSelect;
export type NewCoachNote = typeof coachNotes.$inferInsert;
export type ProgressPhoto = typeof progressPhotos.$inferSelect;
export type NewProgressPhoto = typeof progressPhotos.$inferInsert;
export type RoutineStepCompletion = typeof routineStepCompletions.$inferSelect;
export type NewRoutineStepCompletion =
  typeof routineStepCompletions.$inferInsert;
export type Survey = typeof surveys.$inferSelect;
export type NewSurvey = typeof surveys.$inferInsert;
export type SurveyQuestion = typeof surveyQuestions.$inferSelect;
export type NewSurveyQuestion = typeof surveyQuestions.$inferInsert;
export type SurveySubmission = typeof surveySubmissions.$inferSelect;
export type NewSurveySubmission = typeof surveySubmissions.$inferInsert;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type NewSurveyResponse = typeof surveyResponses.$inferInsert;
export type Journal = typeof journals.$inferSelect;
export type NewJournal = typeof journals.$inferInsert;
export type ProfileTag = typeof profileTags.$inferSelect;
export type NewProfileTag = typeof profileTags.$inferInsert;
