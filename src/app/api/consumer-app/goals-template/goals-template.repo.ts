// Repository layer for goals template data access
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { type SkinGoalsTemplate } from "@/lib/db/schema";

// Derive types from centralized schema (TYPE_SYSTEM_GUIDE.md)
export type GoalsTemplateUpdateData = Partial<
  Pick<SkinGoalsTemplate, "goalsAcknowledgedByClient" | "status">
>;

export type GoalsTemplateData = Pick<
  SkinGoalsTemplate,
  "id" | "userId" | "status" | "goalsAcknowledgedByClient" | "updatedAt"
>;

// For dependency injection in tests
export type GoalsTemplateRepoDeps = {
  db?:
    | typeof db
    | PostgresJsDatabase<typeof schema>
    | PgliteDatabase<typeof schema>;
};

export function makeGoalsTemplateRepo(deps: GoalsTemplateRepoDeps = {}) {
  const database = deps.db || db;

  return {
    /**
     * Get goals template by user profile ID
     */
    async getGoalsTemplateByUserProfileId(
      userProfileId: string,
    ): Promise<GoalsTemplateData | null> {
      const result = await database
        .select({
          id: schema.skinGoalsTemplate.id,
          userId: schema.skinGoalsTemplate.userId,
          status: schema.skinGoalsTemplate.status,
          goalsAcknowledgedByClient:
            schema.skinGoalsTemplate.goalsAcknowledgedByClient,
          updatedAt: schema.skinGoalsTemplate.updatedAt,
        })
        .from(schema.skinGoalsTemplate)
        .where(eq(schema.skinGoalsTemplate.userId, userProfileId))
        .limit(1);

      return result[0] || null;
    },

    /**
     * Get user profile ID from auth user ID
     */
    async getUserProfileIdByUserId(userId: string): Promise<string | null> {
      const result = await database
        .select({ id: schema.userProfiles.id })
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, userId))
        .limit(1);

      return result[0]?.id || null;
    },

    /**
     * Update goals template
     */
    async updateGoalsTemplate(
      userProfileId: string,
      updates: GoalsTemplateUpdateData,
    ): Promise<GoalsTemplateData | null> {
      const result = await database
        .update(schema.skinGoalsTemplate)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(schema.skinGoalsTemplate.userId, userProfileId))
        .returning();

      if (!result[0]) return null;

      // Return only the fields we need for GoalsTemplateData
      return {
        id: result[0].id,
        userId: result[0].userId,
        status: result[0].status,
        goalsAcknowledgedByClient: result[0].goalsAcknowledgedByClient,
        updatedAt: result[0].updatedAt,
      };
    },
  };
}
