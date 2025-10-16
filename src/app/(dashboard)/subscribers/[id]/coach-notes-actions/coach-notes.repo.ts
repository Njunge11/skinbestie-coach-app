import { db } from "@/lib/db";
import { coachNotes } from "@/lib/db/schema";
import type { CoachNote, NewCoachNote } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export function makeCoachNotesRepo() {
  return {
    async create(note: NewCoachNote): Promise<CoachNote> {
      const [created] = await db.insert(coachNotes).values(note).returning();
      return created;
    },

    async findById(noteId: string): Promise<CoachNote | null> {
      const [note] = await db
        .select()
        .from(coachNotes)
        .where(eq(coachNotes.id, noteId));
      return note || null;
    },

    async findByUserProfileId(userProfileId: string): Promise<CoachNote[]> {
      const notes = await db
        .select()
        .from(coachNotes)
        .where(eq(coachNotes.userProfileId, userProfileId))
        .orderBy(desc(coachNotes.createdAt));
      return notes;
    },

    async update(
      noteId: string,
      updates: Partial<CoachNote>
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
