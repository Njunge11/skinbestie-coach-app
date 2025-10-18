// Fake repository for testing

export interface Routine {
  id: string;
  userProfileId: string;
  name: string;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewRoutine = Omit<Routine, "id">;

export function makeRoutineRepoFake() {
  const _store = new Map<string, Routine>();

  return {
    _store, // Expose for testing

    async findByUserId(userId: string): Promise<Routine | null> {
      return Array.from(_store.values()).find((r) => r.userProfileId === userId) || null;
    },

    async create(routine: NewRoutine): Promise<Routine> {
      const newRoutine: Routine = {
        ...routine,
        id: `routine_${Date.now()}`,
      };
      _store.set(newRoutine.id, newRoutine);
      return newRoutine;
    },

    async update(routineId: string, updates: Partial<Routine>): Promise<Routine | null> {
      const existing = _store.get(routineId);
      if (!existing) return null;

      const updated = { ...existing, ...updates };
      _store.set(routineId, updated);
      return updated;
    },

    async deleteById(routineId: string): Promise<Routine | null> {
      const existing = _store.get(routineId);
      if (!existing) return null;

      _store.delete(routineId);
      return existing;
    },
  };
}
