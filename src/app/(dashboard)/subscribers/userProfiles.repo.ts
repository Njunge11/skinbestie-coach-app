import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq, or, and, ilike, sql, desc, asc, gte } from "drizzle-orm";

// Real repository implementation using Drizzle ORM
export function makeUserProfilesRepo(database: typeof db) {
  return {
    async findById(id: string) {
      const result = await database
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, id))
        .limit(1);
      return result[0] || null;
    },

    async findByEmail(email: string) {
      const result = await database
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.email, email))
        .limit(1);
      return result[0] || null;
    },

    async findByEmailAndPhone(email: string, phoneNumber: string) {
      const result = await database
        .select()
        .from(userProfiles)
        .where(and(eq(userProfiles.email, email), eq(userProfiles.phoneNumber, phoneNumber)))
        .limit(1);
      return result[0] || null;
    },

    async findByEmailOrPhone(email: string, phoneNumber: string) {
      const result = await database
        .select()
        .from(userProfiles)
        .where(or(eq(userProfiles.email, email), eq(userProfiles.phoneNumber, phoneNumber)))
        .limit(1);
      return result[0] || null;
    },

    async create(data: typeof userProfiles.$inferInsert) {
      const [row] = await database.insert(userProfiles).values(data).returning();
      return row || null;
    },

    async update(id: string, data: Partial<typeof userProfiles.$inferInsert>) {
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
      const whereConditions: Parameters<typeof and>= [];

      // Search filter (name or email)
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
            sql`${userProfiles.isSubscribed} IS NULL`
          )!
        );
      }

      // Date range filter
      if (filters.dateRangeStart) {
        whereConditions.push(gte(userProfiles.createdAt, filters.dateRangeStart));
      }

      // Combine WHERE conditions
      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

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

      // Get total count
      const countResult = await database
        .select({ count: sql<number>`count(*)` })
        .from(userProfiles)
        .where(whereClause);

      const totalCount = Number(countResult[0]?.count || 0);

      // Get paginated data
      const profiles = await database
        .select()
        .from(userProfiles)
        .where(whereClause)
        .orderBy(...orderByClause)
        .limit(filters.limit || 20)
        .offset(filters.offset || 0);

      return { profiles, totalCount };
    },
  };
}

// Default repository instance
export const userProfilesRepo = makeUserProfilesRepo(db);
