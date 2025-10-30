// Repository for skin_goals_template table

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { skinGoalsTemplate } from "@/lib/db/schema";
import { type SkinGoalsTemplateRow } from "@/lib/db/types";

// Type definitions derived from schema
export type GoalsTemplate = Pick<
  SkinGoalsTemplateRow,
  | "id"
  | "userId"
  | "status"
  | "createdBy"
  | "updatedBy"
  | "createdAt"
  | "updatedAt"
>;

export type NewGoalsTemplate = Omit<
  GoalsTemplate,
  "id" | "createdAt" | "updatedAt"
>;
export type GoalsTemplateUpdate = Partial<
  Pick<GoalsTemplate, "status" | "updatedBy" | "updatedAt">
>;

export function makeGoalsTemplateRepo() {
  return {
    /**
     * Find template by user ID
     */
    async findByUserId(userId: string): Promise<GoalsTemplate | null> {
      const [template] = await db
        .select({
          id: skinGoalsTemplate.id,
          userId: skinGoalsTemplate.userId,
          status: skinGoalsTemplate.status,
          createdBy: skinGoalsTemplate.createdBy,
          updatedBy: skinGoalsTemplate.updatedBy,
          createdAt: skinGoalsTemplate.createdAt,
          updatedAt: skinGoalsTemplate.updatedAt,
        })
        .from(skinGoalsTemplate)
        .where(eq(skinGoalsTemplate.userId, userId))
        .limit(1);

      return template ? (template as GoalsTemplate) : null;
    },

    /**
     * Create a new template
     */
    async create(template: NewGoalsTemplate): Promise<GoalsTemplate> {
      const [newTemplate] = await db
        .insert(skinGoalsTemplate)
        .values(template)
        .returning();

      return newTemplate as GoalsTemplate;
    },

    /**
     * Update template status (publish/unpublish)
     */
    async updateStatus(
      templateId: string,
      status: "published" | "unpublished",
      adminId: string,
    ): Promise<GoalsTemplate | null> {
      const [updated] = await db
        .update(skinGoalsTemplate)
        .set({
          status,
          updatedBy: adminId,
          updatedAt: new Date(),
        })
        .where(eq(skinGoalsTemplate.id, templateId))
        .returning();

      return updated ? (updated as GoalsTemplate) : null;
    },

    /**
     * Update template metadata
     */
    async update(
      templateId: string,
      updates: GoalsTemplateUpdate,
    ): Promise<GoalsTemplate | null> {
      const [updated] = await db
        .update(skinGoalsTemplate)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(skinGoalsTemplate.id, templateId))
        .returning();

      return updated ? (updated as GoalsTemplate) : null;
    },

    /**
     * Find template by ID
     */
    async findById(templateId: string): Promise<GoalsTemplate | null> {
      const [template] = await db
        .select({
          id: skinGoalsTemplate.id,
          userId: skinGoalsTemplate.userId,
          status: skinGoalsTemplate.status,
          createdBy: skinGoalsTemplate.createdBy,
          updatedBy: skinGoalsTemplate.updatedBy,
          createdAt: skinGoalsTemplate.createdAt,
          updatedAt: skinGoalsTemplate.updatedAt,
        })
        .from(skinGoalsTemplate)
        .where(eq(skinGoalsTemplate.id, templateId))
        .limit(1)
        .execute();

      return template ? (template as GoalsTemplate) : null;
    },

    /**
     * Delete template (cascades to goals)
     */
    async deleteById(templateId: string): Promise<GoalsTemplate | null> {
      const [deleted] = await db
        .delete(skinGoalsTemplate)
        .where(eq(skinGoalsTemplate.id, templateId))
        .returning();

      return deleted ? (deleted as GoalsTemplate) : null;
    },

    /**
     * Update acknowledgment status
     */
    async updateAcknowledgment(
      templateId: string,
      acknowledged: boolean,
      timestamp: Date,
    ): Promise<GoalsTemplate | null> {
      const [updated] = await db
        .update(skinGoalsTemplate)
        .set({
          goalsAcknowledgedByClient: acknowledged,
          updatedAt: timestamp,
        })
        .where(eq(skinGoalsTemplate.id, templateId))
        .returning();

      return updated ? (updated as GoalsTemplate) : null;
    },
  };
}
