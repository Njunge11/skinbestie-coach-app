"use server";

import { db } from "@/lib/db";
import { users, userProfiles as userProfilesTable } from "@/lib/db/schema";
import { userProfilesRepo } from "./userProfiles.repo";
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
  repo: typeof userProfilesRepo;
  now: () => Date;
}

// Default dependencies
const defaultDeps: UserProfileDeps = {
  repo: userProfilesRepo,
  now: () => new Date(),
};

// Create profile (Step 1 only)
export async function createUserProfile(
  input: UserProfileCreate,
  deps: UserProfileDeps = defaultDeps,
) {
  try {
    // Validate input
    const validated = UserProfileCreateSchema.parse(input);

    const email = normalizeEmail(validated.email);
    const phone = normalizePhone(validated.phoneNumber);

    // Check if profile exists with BOTH email AND phone
    const exactMatch = await deps.repo.findByEmailAndPhone(email, phone);

    // If exact match found, return existing profile without personal info
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

    // Check if email exists with different phone
    const emailMatch = await deps.repo.findByEmail(email);

    if (emailMatch && emailMatch.phoneNumber !== phone) {
      return {
        success: false,
        error: "Email is already registered with a different phone number",
      };
    }

    // Check if phone is already taken with different email
    const phoneMatch = await deps.repo.findByEmailOrPhone("", phone);

    if (phoneMatch && phoneMatch.email !== email) {
      return {
        success: false,
        error: "Phone number is already registered with a different email",
      };
    }

    // Create user and profile in a transaction
    const row = await db.transaction(async (tx) => {
      // 1. Create user in auth table
      const [newUser] = await tx
        .insert(users)
        .values({
          email,
          name: `${validated.firstName} ${validated.lastName}`,
          emailVerified: null,
          image: null,
        })
        .returning();

      if (!newUser) {
        throw new Error("Failed to create user");
      }

      // 2. Create user profile linked to auth user
      const [newProfile] = await tx
        .insert(userProfilesTable)
        .values({
          userId: newUser.id,
          firstName: validated.firstName,
          lastName: validated.lastName,
          phoneNumber: phone,
          email,
          dateOfBirth: parseDateOnlyToDate(validated.dateOfBirth),
          completedSteps: ["PERSONAL"],
        })
        .returning();

      if (!newProfile) {
        throw new Error("Failed to create profile");
      }

      return newProfile;
    });

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
  deps: UserProfileDeps = defaultDeps,
) {
  try {
    const profile = await deps.repo.findById(id);

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
  deps: UserProfileDeps = defaultDeps,
) {
  try {
    const normalizedEmail = normalizeEmail(email);
    const profile = await deps.repo.findByEmail(normalizedEmail);

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
  deps: UserProfileDeps = defaultDeps,
) {
  try {
    if (!input.email && !input.phoneNumber) {
      return {
        success: false,
        error: "Either email or phoneNumber must be provided",
      };
    }

    const email = input.email ? normalizeEmail(input.email) : "";
    const phone = input.phoneNumber ? normalizePhone(input.phoneNumber) : "";

    const profile = await deps.repo.findByEmailOrPhone(email, phone);

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
  deps: UserProfileDeps = defaultDeps,
) {
  try {
    // Validate input
    const validated = UserProfileUpdateSchema.parse(input);

    // Convert completedAt string to Date if provided
    const updateData = {
      ...validated,
      completedAt: validated.completedAt
        ? new Date(validated.completedAt)
        : undefined,
      updatedAt: deps.now(),
    };

    const updated = await deps.repo.update(id, updateData);

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
  deps: UserProfileDeps = defaultDeps,
) {
  try {
    const { searchQuery, completionStatus, subscriptionStatus, dateRange } =
      filters;
    const { page, pageSize } = pagination;
    const { sortBy, sortOrder } = sort;

    // Calculate date range start if needed
    let dateRangeStart: Date | undefined;
    if (dateRange && dateRange !== "all") {
      const now = deps.now();
      if (dateRange === "recent") {
        // Last 7 days
        dateRangeStart = new Date(now);
        dateRangeStart.setDate(dateRangeStart.getDate() - 7);
      } else if (dateRange === "this_month") {
        // Start of current month
        dateRangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (dateRange === "last_30_days") {
        // Last 30 days
        dateRangeStart = new Date(now);
        dateRangeStart.setDate(dateRangeStart.getDate() - 30);
      }
    }

    const { profiles, totalCount } = await deps.repo.findMany({
      searchQuery,
      completionStatus,
      subscriptionStatus,
      dateRangeStart,
      sortBy,
      sortOrder,
      limit: pageSize,
      offset: page * pageSize,
    });

    return {
      success: true,
      data: {
        profiles,
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
