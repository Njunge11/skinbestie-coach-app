import { db } from "@/lib/db";
import { coachNotes } from "@/lib/db/schema";
import { type CoachNoteRow, type CoachNoteInsert } from "@/lib/db/types";
import { eq, desc } from "drizzle-orm";

// Repository-specific types derived from centralized types (TYPE_SYSTEM_GUIDE.md)
export type CoachNote = CoachNoteRow;
export type NewCoachNote = CoachNoteInsert;

export function makeCoachNotesRepo() {
  return {
    async create(note: NewCoachNote): Promise<CoachNote> {
      const [created] = await db.insert(coachNotes).values(note).returning();
      return created;
    },

    async findById(noteId: string): Promise<CoachNote | null> {
      const [note] = await db
        .select({
          id: coachNotes.id,
          userProfileId: coachNotes.userProfileId,
          adminId: coachNotes.adminId,
          content: coachNotes.content,
          createdAt: coachNotes.createdAt,
          updatedAt: coachNotes.updatedAt,
        })
        .from(coachNotes)
        .where(eq(coachNotes.id, noteId));
      return note || null;
    },

    async findByUserProfileId(userProfileId: string): Promise<CoachNote[]> {
      const notes = await db
        .select({
          id: coachNotes.id,
          userProfileId: coachNotes.userProfileId,
          adminId: coachNotes.adminId,
          content: coachNotes.content,
          createdAt: coachNotes.createdAt,
          updatedAt: coachNotes.updatedAt,
        })
        .from(coachNotes)
        .where(eq(coachNotes.userProfileId, userProfileId))
        .orderBy(desc(coachNotes.createdAt))
        .limit(100);
      return notes;
    },

    async update(
      noteId: string,
      updates: Partial<CoachNote>,
    ): Promise<CoachNote | null> {
      const [updated] = await db
        .update(coachNotes)
        .set(updates)
        .where(eq(coachNotes.id, noteId))
        .returning();
      return updated || null;
    },

    async deleteById(noteId: string): Promise<CoachNote | null> {
      const [deleted] = await db
        .delete(coachNotes)
        .where(eq(coachNotes.id, noteId))
        .returning();
      return deleted || null;
    },
  };
}
