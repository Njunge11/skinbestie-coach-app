import { db as defaultDb } from "@/lib/db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type { NewJournal, Journal } from "@/lib/db/schema";
import * as schema from "@/lib/db/schema";
import { eq, and, or, lt, desc } from "drizzle-orm";

export interface IJournalsRepository {
  createJournal(data: NewJournal): Promise<Journal>;
  updateJournal(
    id: string,
    data: Partial<Omit<NewJournal, "userProfileId">>,
  ): Promise<Journal | null>;
  findJournalById(id: string): Promise<Journal | null>;
  deleteJournal(id: string): Promise<boolean>;
  findJournalsByUserProfileId(params: {
    userProfileId: string;
    cursor?: { lastModified: Date; id: string };
    limit: number;
  }): Promise<Journal[]>;
}

// For dependency injection in tests
export type JournalsRepoDeps = {
  db?:
    | typeof defaultDb
    | PostgresJsDatabase<typeof schema>
    | PgliteDatabase<typeof schema>;
};

export function createJournalsRepository(
  deps: JournalsRepoDeps = {},
): IJournalsRepository {
  const db = deps.db || defaultDb;

  return {
    async createJournal(data: NewJournal): Promise<Journal> {
      const [journal] = await db
        .insert(schema.journals)
        .values(data)
        .returning();

      return journal;
    },

    async updateJournal(
      id: string,
      data: Partial<Omit<NewJournal, "userProfileId">>,
    ): Promise<Journal | null> {
      const [journal] = await db
        .update(schema.journals)
        .set({
          ...data,
          lastModified: new Date(),
        })
        .where(eq(schema.journals.id, id))
        .returning();

      return journal || null;
    },

    async findJournalById(id: string): Promise<Journal | null> {
      try {
        const [journal] = await db
          .select()
          .from(schema.journals)
          .where(eq(schema.journals.id, id));

        return journal || null;
      } catch {
        // Handle invalid UUID format or other errors
        return null;
      }
    },

    async deleteJournal(id: string): Promise<boolean> {
      try {
        const result = await db
          .delete(schema.journals)
          .where(eq(schema.journals.id, id))
          .returning();

        return result.length > 0;
      } catch {
        // Handle invalid UUID format or other errors
        return false;
      }
    },

    async findJournalsByUserProfileId(params: {
      userProfileId: string;
      cursor?: { lastModified: Date; id: string };
      limit: number;
    }): Promise<Journal[]> {
      const { userProfileId, cursor, limit } = params;

      // Build cursor condition for pagination
      // Order by lastModified DESC, id DESC
      // For cursor pagination: WHERE (lastModified < cursor.lastModified) OR (lastModified = cursor.lastModified AND id < cursor.id)
      const cursorCondition = cursor
        ? or(
            lt(schema.journals.lastModified, cursor.lastModified),
            and(
              eq(schema.journals.lastModified, cursor.lastModified),
              lt(schema.journals.id, cursor.id),
            ),
          )
        : undefined;

      const conditions = cursorCondition
        ? and(eq(schema.journals.userProfileId, userProfileId), cursorCondition)
        : eq(schema.journals.userProfileId, userProfileId);

      const journals = await db
        .select()
        .from(schema.journals)
        .where(conditions)
        .orderBy(desc(schema.journals.lastModified), desc(schema.journals.id))
        .limit(limit);

      return journals;
    },
  };
}
