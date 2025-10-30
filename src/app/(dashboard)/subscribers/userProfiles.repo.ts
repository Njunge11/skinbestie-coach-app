import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { type UserProfileRow, type UserProfileInsert } from "@/lib/db/types";
import { eq, or, and, ilike, sql, desc, asc, gte } from "drizzle-orm";

// Repository-specific types derived from centralized types (TYPE_SYSTEM_GUIDE.md)
export type UserProfile = UserProfileRow;
export type NewUserProfile = UserProfileInsert;

// Real repository implementation using Drizzle ORM
export function makeUserProfilesRepo(database: typeof db) {
  return {
    async findById(id: string) {
      const result = await database
        .select({
          id: userProfiles.id,
          userId: userProfiles.userId,
          firstName: userProfiles.firstName,
          lastName: userProfiles.lastName,
          email: userProfiles.email,
          phoneNumber: userProfiles.phoneNumber,
          dateOfBirth: userProfiles.dateOfBirth,
          skinType: userProfiles.skinType,
          concerns: userProfiles.concerns,
          hasAllergies: userProfiles.hasAllergies,
          allergyDetails: userProfiles.allergyDetails,
          isSubscribed: userProfiles.isSubscribed,
          hasCompletedBooking: userProfiles.hasCompletedBooking,
          occupation: userProfiles.occupation,
          bio: userProfiles.bio,
          timezone: userProfiles.timezone,
          completedSteps: userProfiles.completedSteps,
          isCompleted: userProfiles.isCompleted,
          completedAt: userProfiles.completedAt,
          createdAt: userProfiles.createdAt,
          updatedAt: userProfiles.updatedAt,
        })
        .from(userProfiles)
        .where(eq(userProfiles.id, id))
        .limit(1);
      return result[0] || null;
    },

    async findByEmail(email: string) {
      const result = await database
        .select({
          id: userProfiles.id,
          userId: userProfiles.userId,
          firstName: userProfiles.firstName,
          lastName: userProfiles.lastName,
          email: userProfiles.email,
          phoneNumber: userProfiles.phoneNumber,
          dateOfBirth: userProfiles.dateOfBirth,
          skinType: userProfiles.skinType,
          concerns: userProfiles.concerns,
          hasAllergies: userProfiles.hasAllergies,
          allergyDetails: userProfiles.allergyDetails,
          isSubscribed: userProfiles.isSubscribed,
          hasCompletedBooking: userProfiles.hasCompletedBooking,
          occupation: userProfiles.occupation,
          bio: userProfiles.bio,
          timezone: userProfiles.timezone,
          completedSteps: userProfiles.completedSteps,
          isCompleted: userProfiles.isCompleted,
          completedAt: userProfiles.completedAt,
          createdAt: userProfiles.createdAt,
          updatedAt: userProfiles.updatedAt,
        })
        .from(userProfiles)
        .where(eq(userProfiles.email, email))
        .limit(1);
      return result[0] || null;
    },

    async findByEmailAndPhone(email: string, phoneNumber: string) {
      const result = await database
        .select({
          id: userProfiles.id,
          userId: userProfiles.userId,
          firstName: userProfiles.firstName,
          lastName: userProfiles.lastName,
          email: userProfiles.email,
          phoneNumber: userProfiles.phoneNumber,
          dateOfBirth: userProfiles.dateOfBirth,
          skinType: userProfiles.skinType,
          concerns: userProfiles.concerns,
          hasAllergies: userProfiles.hasAllergies,
          allergyDetails: userProfiles.allergyDetails,
          isSubscribed: userProfiles.isSubscribed,
          hasCompletedBooking: userProfiles.hasCompletedBooking,
          occupation: userProfiles.occupation,
          bio: userProfiles.bio,
          timezone: userProfiles.timezone,
          completedSteps: userProfiles.completedSteps,
          isCompleted: userProfiles.isCompleted,
          completedAt: userProfiles.completedAt,
          createdAt: userProfiles.createdAt,
          updatedAt: userProfiles.updatedAt,
        })
        .from(userProfiles)
        .where(
          and(
            eq(userProfiles.email, email),
            eq(userProfiles.phoneNumber, phoneNumber),
          ),
        )
        .limit(1);
      return result[0] || null;
    },

    async findByEmailOrPhone(email: string, phoneNumber: string) {
      const result = await database
        .select({
          id: userProfiles.id,
          userId: userProfiles.userId,
          firstName: userProfiles.firstName,
          lastName: userProfiles.lastName,
          email: userProfiles.email,
          phoneNumber: userProfiles.phoneNumber,
          dateOfBirth: userProfiles.dateOfBirth,
          skinType: userProfiles.skinType,
          concerns: userProfiles.concerns,
          hasAllergies: userProfiles.hasAllergies,
          allergyDetails: userProfiles.allergyDetails,
          isSubscribed: userProfiles.isSubscribed,
          hasCompletedBooking: userProfiles.hasCompletedBooking,
          occupation: userProfiles.occupation,
          bio: userProfiles.bio,
          timezone: userProfiles.timezone,
          completedSteps: userProfiles.completedSteps,
          isCompleted: userProfiles.isCompleted,
          completedAt: userProfiles.completedAt,
          createdAt: userProfiles.createdAt,
          updatedAt: userProfiles.updatedAt,
        })
        .from(userProfiles)
        .where(
          or(
            eq(userProfiles.email, email),
            eq(userProfiles.phoneNumber, phoneNumber),
          ),
        )
        .limit(1);
      return result[0] || null;
    },

    async create(data: NewUserProfile) {
      const [row] = await database
        .insert(userProfiles)
        .values(data)
        .returning();
      return row || null;
    },

    async update(id: string, data: Partial<NewUserProfile>) {
      const [updated] = await database
        .update(userProfiles)
        .set(data)
        .where(eq(userProfiles.id, id))
        .returning();
      return updated || null;
    },

    async findMany(filters: {
      searchQuery?: string;
      completionStatus?: string;
      subscriptionStatus?: string;
      dateRangeStart?: Date;
      sortBy?: string;
      sortOrder?: string;
      limit?: number;
      offset?: number;
    }) {
      const whereConditions: Parameters<typeof and> = [];

      // Search filter (name or email)
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const searchTerm = `%${filters.searchQuery.trim()}%`;
        whereConditions.push(
          or(
            ilike(userProfiles.firstName, searchTerm),
            ilike(userProfiles.lastName, searchTerm),
            ilike(userProfiles.email, searchTerm),
          )!,
        );
      }

      // Completion status filter
      if (filters.completionStatus === "completed") {
        whereConditions.push(eq(userProfiles.isCompleted, true));
      } else if (filters.completionStatus === "incomplete") {
        whereConditions.push(eq(userProfiles.isCompleted, false));
      }

      // Subscription status filter
      if (filters.subscriptionStatus === "subscribed") {
        whereConditions.push(eq(userProfiles.isSubscribed, true));
      } else if (filters.subscriptionStatus === "not_subscribed") {
        whereConditions.push(
          or(
            eq(userProfiles.isSubscribed, false),
            sql`${userProfiles.isSubscribed} IS NULL`,
          )!,
        );
      }

      // Date range filter
      if (filters.dateRangeStart) {
        whereConditions.push(
          gte(userProfiles.createdAt, filters.dateRangeStart),
        );
      }

      // Combine WHERE conditions
      const whereClause =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Build ORDER BY clause
      const orderByClause =
        filters.sortBy === "name"
          ? filters.sortOrder === "asc"
            ? [asc(userProfiles.firstName), asc(userProfiles.lastName)]
            : [desc(userProfiles.firstName), desc(userProfiles.lastName)]
          : filters.sortBy === "email"
            ? filters.sortOrder === "asc"
              ? [asc(userProfiles.email)]
              : [desc(userProfiles.email)]
            : filters.sortOrder === "asc"
              ? [asc(userProfiles.createdAt)]
              : [desc(userProfiles.createdAt)];

      // Get paginated data with total count in a single query using window function
      const results = await database
        .select({
          id: userProfiles.id,
          userId: userProfiles.userId,
          firstName: userProfiles.firstName,
          lastName: userProfiles.lastName,
          email: userProfiles.email,
          phoneNumber: userProfiles.phoneNumber,
          dateOfBirth: userProfiles.dateOfBirth,
          skinType: userProfiles.skinType,
          concerns: userProfiles.concerns,
          hasAllergies: userProfiles.hasAllergies,
          allergyDetails: userProfiles.allergyDetails,
          isSubscribed: userProfiles.isSubscribed,
          hasCompletedBooking: userProfiles.hasCompletedBooking,
          hasCompletedSkinTest: userProfiles.hasCompletedSkinTest,
          occupation: userProfiles.occupation,
          bio: userProfiles.bio,
          timezone: userProfiles.timezone,
          completedSteps: userProfiles.completedSteps,
          isCompleted: userProfiles.isCompleted,
          completedAt: userProfiles.completedAt,
          createdAt: userProfiles.createdAt,
          updatedAt: userProfiles.updatedAt,
          totalCount: sql<number>`count(*) OVER()`,
        })
        .from(userProfiles)
        .where(whereClause)
        .orderBy(...orderByClause)
        .limit(filters.limit || 20)
        .offset(filters.offset || 0);

      // Extract total count from first row (all rows have the same count due to window function)
      const totalCount = results.length > 0 ? Number(results[0].totalCount) : 0;

      // Remove totalCount from profiles (it's not part of the profile data)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const profiles = results.map(({ totalCount: _, ...profile }) => profile);

      return { profiles, totalCount };
    },
  };
}

// Default repository instance
export const userProfilesRepo = makeUserProfilesRepo(db);
