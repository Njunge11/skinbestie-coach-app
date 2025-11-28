// Fake repository for unit testing (follows TESTING.md)

import { type SkincareRoutine } from "@/lib/db/schema";

// Derive types from centralized schema
export type Routine = Pick<
  SkincareRoutine,
  | "id"
  | "userProfileId"
  | "name"
  | "startDate"
  | "endDate"
  | "status"
  | "savedAsTemplate"
  | "createdAt"
  | "updatedAt"
>;

export type NewRoutine = Omit<Routine, "id" | "createdAt" | "updatedAt">;

export function makeRoutineRepoFake() {
  const routineStore = new Map<string, Routine>();
  let idCounter = 0;

  return {
    async findById(routineId: string): Promise<Routine | null> {
      return routineStore.get(routineId) || null;
    },

    async findByUserId(userId: string): Promise<Routine | null> {
      return (
        Array.from(routineStore.values()).find(
          (r) => r.userProfileId === userId,
        ) || null
      );
    },

    async create(routine: NewRoutine): Promise<Routine> {
      const id = `routine_${++idCounter}`;
      const now = new Date();
      const newRoutine: Routine = {
        ...routine,
        id,
        createdAt: now,
        updatedAt: now,
      };
      routineStore.set(id, newRoutine);
      return newRoutine;
    },

    async update(
      routineId: string,
      updates: Partial<Routine>,
    ): Promise<Routine | null> {
      const routine = routineStore.get(routineId);
      if (!routine) return null;

      Object.assign(routine, updates);
      return routine;
    },

    async deleteById(routineId: string): Promise<Routine | null> {
      const routine = routineStore.get(routineId);
      if (!routine) return null;

      routineStore.delete(routineId);
      return routine;
    },

    // Test helper to inspect state
    _routineStore: routineStore,
  };
}
