"use server";

import { z } from "zod";
import { makeCoachNotesRepo } from "./coach-notes.repo";
import type { CoachNote } from "@/lib/db/schema";

type Result<T> = { success: true; data: T } | { success: false; error: string };

export interface CoachNoteDeps {
  repo: ReturnType<typeof makeCoachNotesRepo>;
  now: () => Date;
}

const defaultDeps: CoachNoteDeps = {
  repo: makeCoachNotesRepo(),
  now: () => new Date(),
};

// Zod schemas for validation
const uuidSchema = z.string().uuid();
const contentSchema = z.string().trim().min(1); // Trim first, then check min length

const createNoteSchema = z.object({
  userProfileId: uuidSchema,
  adminId: uuidSchema,
  content: contentSchema,
});

const updateNoteSchema = z.object({
  noteId: uuidSchema,
  content: contentSchema,
});

const deleteNoteSchema = z.object({
  noteId: uuidSchema,
});

const getNotesSchema = z.object({
  userProfileId: uuidSchema,
});

export async function createCoachNote(
  userProfileId: string,
  adminId: string,
  content: string,
  deps: CoachNoteDeps = defaultDeps
): Promise<Result<CoachNote>> {
  const { repo, now } = deps;

  // Validate input with Zod
  const validation = createNoteSchema.safeParse({
    userProfileId,
    adminId,
    content,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    const timestamp = now();
    const newNote = await repo.create({
      userProfileId: validation.data.userProfileId,
      adminId: validation.data.adminId,
      content: validation.data.content, // Already trimmed by Zod
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return { success: true, data: newNote };
  } catch (error) {
    console.error("Error creating coach note:", error);
    return { success: false, error: "Failed to create note" };
  }
}

export async function updateCoachNote(
  noteId: string,
  content: string,
  deps: CoachNoteDeps = defaultDeps
): Promise<Result<CoachNote>> {
  const { repo, now } = deps;

  // Validate input with Zod
  const validation = updateNoteSchema.safeParse({
    noteId,
    content,
  });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    const existing = await repo.findById(validation.data.noteId);
    if (!existing) {
      return { success: false, error: "Note not found" };
    }

    const timestamp = now();
    const updated = await repo.update(validation.data.noteId, {
      content: validation.data.content, // Already trimmed by Zod
      updatedAt: timestamp,
    });

    if (!updated) {
      return { success: false, error: "Note not found" };
    }

    return { success: true, data: updated };
  } catch (error) {
    console.error("Error updating coach note:", error);
    return { success: false, error: "Failed to update note" };
  }
}

export async function deleteCoachNote(
  noteId: string,
  deps: CoachNoteDeps = defaultDeps
): Promise<Result<CoachNote>> {
  const { repo } = deps;

  // Validate input with Zod
  const validation = deleteNoteSchema.safeParse({ noteId });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    const deleted = await repo.deleteById(validation.data.noteId);
    if (!deleted) {
      return { success: false, error: "Note not found" };
    }

    return { success: true, data: deleted };
  } catch (error) {
    console.error("Error deleting coach note:", error);
    return { success: false, error: "Failed to delete note" };
  }
}

export async function getCoachNotes(
  userProfileId: string,
  deps: CoachNoteDeps = defaultDeps
): Promise<Result<CoachNote[]>> {
  const { repo } = deps;

  // Validate input with Zod
  const validation = getNotesSchema.safeParse({ userProfileId });

  if (!validation.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    const notes = await repo.findByUserProfileId(validation.data.userProfileId);
    return { success: true, data: notes };
  } catch (error) {
    console.error("Error fetching coach notes:", error);
    return { success: false, error: "Failed to fetch notes" };
  }
}
