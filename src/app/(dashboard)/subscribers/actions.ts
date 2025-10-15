"use server";

import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq, or, and, ilike, sql, desc, asc, gte } from "drizzle-orm";
import {
  UserProfileCreateSchema,
  UserProfileUpdateSchema,
  normalizeEmail,
  normalizePhone,
  parseDateOnlyToDate,
  type UserProfileCreate,
  type UserProfileUpdate,
  type UserProfileFilters,
  type UserProfilePagination,
  type UserProfileSort,
} from "./schemas";

// Dependencies interface for testing
export interface UserProfileDeps {
  db: typeof db;
  now: () => Date;
}

// Default dependencies
const defaultDeps: UserProfileDeps = {
  db,
  now: () => new Date(),
};

// Create profile (Step 1 only)
export async function createUserProfile(
  input: UserProfileCreate,
  deps: UserProfileDeps = defaultDeps
) {
  try {
    // Validate input
    const validated = UserProfileCreateSchema.parse(input);

    const email = normalizeEmail(validated.email);
    const phone = normalizePhone(validated.phoneNumber);

    // Check if profile exists with BOTH email AND phone
    const exactMatch = await deps.db.query.userProfiles.findFirst({
      where: (acct, { and, eq }) =>
        and(eq(acct.email, email), eq(acct.phoneNumber, phone)),
    });

    // If exact match found, allow resume
    if (exactMatch) {
      const completedSteps = exactMatch.completedSteps || [];

      return {
        success: true,
        data: {
          id: exactMatch.id,
          completedSteps: completedSteps,
          // Only return data for completed steps
          skinType: completedSteps.includes("SKIN_TYPE")
            ? exactMatch.skinType
            : null,
          concerns: completedSteps.includes("SKIN_CONCERNS")
            ? exactMatch.concerns
            : null,
          hasAllergies: completedSteps.includes("ALLERGIES")
            ? exactMatch.hasAllergies
            : null,
          allergyDetails: completedSteps.includes("ALLERGIES")
            ? exactMatch.allergyDetails
            : null,
          isSubscribed: completedSteps.includes("SUBSCRIBE")
            ? exactMatch.isSubscribed
            : null,
          hasCompletedBooking: completedSteps.includes("BOOKING")
            ? exactMatch.hasCompletedBooking
            : null,
          // Required fields - return empty/null for security
          firstName: "",
          lastName: "",
          email: "",
          phoneNumber: "",
          dateOfBirth: new Date(),
          isCompleted: exactMatch.isCompleted,
          completedAt: exactMatch.completedAt,
          createdAt: exactMatch.createdAt,
          updatedAt: exactMatch.updatedAt,
        },
      };
    }

    // Check if email OR phone is already taken (partial match)
    const partialMatch = await deps.db.query.userProfiles.findFirst({
      where: (acct, { or, eq }) =>
        or(eq(acct.email, email), eq(acct.phoneNumber, phone)),
    });

    if (partialMatch) {
      const field = partialMatch.email === email ? "Email" : "Phone number";
      return {
        success: false,
        error: `${field} is already registered with different details`,
      };
    }

    // Insert Step 1 data only
    const values: typeof userProfiles.$inferInsert = {
      firstName: validated.firstName,
      lastName: validated.lastName,
      phoneNumber: phone,
      email,
      dateOfBirth: parseDateOnlyToDate(validated.dateOfBirth),
      completedSteps: ["PERSONAL"],
    };

    const [row] = await deps.db.insert(userProfiles).values(values).returning();

    if (!row) {
      return {
        success: false,
        error: "Failed to create profile - no row returned",
      };
    }

    return {
      success: true,
      data: row,
    };
  } catch (error) {
    console.error("Failed to create user profile:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return {
        success: false,
        error: "Invalid input data",
      };
    }

    return {
      success: false,
      error: "Failed to create profile",
    };
  }
}

// Get profile by ID
export async function getUserProfileById(
  id: string,
  deps: UserProfileDeps = defaultDeps
) {
  try {
    const profile = await deps.db.query.userProfiles.findFirst({
      where: (acct, { eq }) => eq(acct.id, id),
    });

    if (!profile) {
      return {
        success: false,
        error: "Profile not found",
      };
    }

    return {
      success: true,
      data: profile,
    };
  } catch (error) {
    console.error("Failed to fetch profile by ID:", error);

    return {
      success: false,
      error: "Failed to fetch profile",
    };
  }
}

// Get profile by email
export async function getUserProfileByEmail(
  email: string,
  deps: UserProfileDeps = defaultDeps
) {
  try {
    const normalizedEmail = normalizeEmail(email);
    const profile = await deps.db.query.userProfiles.findFirst({
      where: (acct, { eq }) => eq(acct.email, normalizedEmail),
    });

    if (!profile) {
      return {
        success: false,
        error: "Profile not found",
      };
    }

    return {
      success: true,
      data: profile,
    };
  } catch (error) {
    console.error("Failed to fetch profile by email:", error);

    return {
      success: false,
      error: "Failed to fetch profile",
    };
  }
}

// Check if email or phone exists
export async function checkUserProfileExists(
  input: { email?: string; phoneNumber?: string },
  deps: UserProfileDeps = defaultDeps
) {
  try {
    if (!input.email && !input.phoneNumber) {
      return {
        success: false,
        error: "Either email or phoneNumber must be provided",
      };
    }

    const email = input.email ? normalizeEmail(input.email) : null;
    const phone = input.phoneNumber ? normalizePhone(input.phoneNumber) : null;

    const profile = await deps.db.query.userProfiles.findFirst({
      where: (acct, { or, eq }) => {
        const clauses = [];
        if (email) clauses.push(eq(acct.email, email));
        if (phone) clauses.push(eq(acct.phoneNumber, phone));
        return or(...clauses);
      },
    });

    return {
      success: true,
      data: {
        exists: !!profile,
        profile: profile || null,
      },
    };
  } catch (error) {
    console.error("Failed to check profile existence:", error);

    return {
      success: false,
      error: "Failed to check profile existence",
    };
  }
}

// Update profile (Steps 2-6)
export async function updateUserProfile(
  id: string,
  input: UserProfileUpdate,
  deps: UserProfileDeps = defaultDeps
) {
  try {
    // Validate input
    const validated = UserProfileUpdateSchema.parse(input);

    // Convert completedAt string to Date if provided
    const updateData: Partial<typeof userProfiles.$inferInsert> = {
      ...validated,
      completedAt: validated.completedAt
        ? new Date(validated.completedAt)
        : undefined,
      updatedAt: deps.now(),
    };

    const [updated] = await deps.db
      .update(userProfiles)
      .set(updateData)
      .where(eq(userProfiles.id, id))
      .returning();

    if (!updated) {
      return {
        success: false,
        error: "Profile not found",
      };
    }

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    console.error("Failed to update user profile:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return {
        success: false,
        error: "Invalid input data",
      };
    }

    return {
      success: false,
      error: "Failed to update profile",
    };
  }
}

// Get paginated user profiles with filters and sorting (server-side)
export async function getUserProfiles(
  filters: UserProfileFilters = {},
  pagination: UserProfilePagination = { page: 0, pageSize: 20 },
  sort: UserProfileSort = { sortBy: "createdAt", sortOrder: "desc" },
  deps: UserProfileDeps = defaultDeps
) {
  try {
    const { searchQuery, completionStatus, subscriptionStatus, dateRange } = filters;
    const { page, pageSize } = pagination;
    const { sortBy, sortOrder } = sort;

    // Build WHERE clauses
    const whereConditions = [];

    // Search filter (name or email)
    if (searchQuery && searchQuery.trim()) {
      const searchTerm = `%${searchQuery.trim()}%`;
      whereConditions.push(
        or(
          ilike(userProfiles.firstName, searchTerm),
          ilike(userProfiles.lastName, searchTerm),
          ilike(userProfiles.email, searchTerm)
        )
      );
    }

    // Completion status filter
    if (completionStatus && completionStatus !== "all") {
      if (completionStatus === "completed") {
        whereConditions.push(eq(userProfiles.isCompleted, true));
      } else if (completionStatus === "incomplete") {
        whereConditions.push(eq(userProfiles.isCompleted, false));
      }
    }

    // Subscription status filter
    if (subscriptionStatus && subscriptionStatus !== "all") {
      if (subscriptionStatus === "subscribed") {
        whereConditions.push(eq(userProfiles.isSubscribed, true));
      } else if (subscriptionStatus === "not_subscribed") {
        whereConditions.push(
          or(
            eq(userProfiles.isSubscribed, false),
            sql`${userProfiles.isSubscribed} IS NULL`
          )
        );
      }
    }

    // Date range filter
    if (dateRange && dateRange !== "all") {
      const now = deps.now();
      let startDate: Date;

      if (dateRange === "recent") {
        // Last 7 days
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        whereConditions.push(gte(userProfiles.createdAt, startDate));
      } else if (dateRange === "this_month") {
        // Start of current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        whereConditions.push(gte(userProfiles.createdAt, startDate));
      } else if (dateRange === "last_30_days") {
        // Last 30 days
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        whereConditions.push(gte(userProfiles.createdAt, startDate));
      }
    }

    // Combine WHERE conditions
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Build ORDER BY clause
    let orderByClause;
    if (sortBy === "name") {
      orderByClause = sortOrder === "asc"
        ? [asc(userProfiles.firstName), asc(userProfiles.lastName)]
        : [desc(userProfiles.firstName), desc(userProfiles.lastName)];
    } else if (sortBy === "email") {
      orderByClause = sortOrder === "asc" ? asc(userProfiles.email) : desc(userProfiles.email);
    } else {
      // Default: createdAt
      orderByClause = sortOrder === "asc" ? asc(userProfiles.createdAt) : desc(userProfiles.createdAt);
    }

    // Get total count
    const countResult = await deps.db
      .select({ count: sql<number>`count(*)` })
      .from(userProfiles)
      .where(whereClause);

    const totalCount = Number(countResult[0]?.count || 0);

    // Get paginated data
    const data = await deps.db
      .select()
      .from(userProfiles)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(pageSize)
      .offset(page * pageSize);

    return {
      success: true,
      data: {
        profiles: data,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  } catch (error) {
    console.error("Failed to fetch user profiles:", error);

    return {
      success: false,
      error: "Failed to fetch user profiles",
    };
  }
}
