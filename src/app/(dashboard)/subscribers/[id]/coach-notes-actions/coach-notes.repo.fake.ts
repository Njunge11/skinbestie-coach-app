export interface CoachNote {
  id: string;
  userProfileId: string;
  adminId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NewCoachNote = Omit<CoachNote, "id">;

export function makeCoachNotesRepoFake() {
  const _store = new Map<string, CoachNote>();
  let _idCounter = 0;

  // Generate a test UUID based on counter
  const generateTestUUID = (counter: number): string => {
    const hex = counter.toString(16).padStart(12, '0');
    return `550e8400-e29b-41d4-a716-${hex}`;
  };

  return {
    _store,
    async create(note: NewCoachNote): Promise<CoachNote> {
      const id = generateTestUUID(++_idCounter);
      const newNote: CoachNote = { id, ...note };
      _store.set(id, newNote);
      return newNote;
    },
    async findById(noteId: string): Promise<CoachNote | null> {
      return _store.get(noteId) || null;
    },
    async findByUserProfileId(userProfileId: string): Promise<CoachNote[]> {
      const notes = Array.from(_store.values()).filter(
        (n) => n.userProfileId === userProfileId
      );
      // Sort by createdAt descending (newest first)
      return notes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    async update(
      noteId: string,
      updates: Partial<CoachNote>
    ): Promise<CoachNote | null> {
      const note = _store.get(noteId);
      if (!note) return null;
      const updated = { ...note, ...updates };
      _store.set(noteId, updated);
      return updated;
    },
    async deleteById(noteId: string): Promise<CoachNote | null> {
      const note = _store.get(noteId);
      if (!note) return null;
      _store.delete(noteId);
      return note;
    },
  };
}
