/**
 * Fake repository for routine step completions - used in unit tests
 * Follows the pattern from TESTING.md
 */

export type RoutineStepCompletion = {
  id: string;
  routineProductId: string;
  userProfileId: string;
  scheduledDate: Date;
  scheduledTimeOfDay: "morning" | "evening";
  onTimeDeadline: Date;
  gracePeriodEnd: Date;
  completedAt: Date | null;
  status: "pending" | "on-time" | "late" | "missed";
  createdAt: Date;
  updatedAt: Date;
};

export type NewRoutineStepCompletion = Omit<RoutineStepCompletion, "id" | "createdAt" | "updatedAt">;

export function makeRoutineStepCompletionsRepoFake() {
  const store = new Map<string, RoutineStepCompletion>();
  let idCounter = 0;

  return {
    /**
     * Create a new routine step completion record
     */
    async create(completion: NewRoutineStepCompletion): Promise<RoutineStepCompletion> {
      const id = `completion_${++idCounter}`;
      const now = new Date();
      const newCompletion: RoutineStepCompletion = {
        ...completion,
        id,
        createdAt: now,
        updatedAt: now,
      };
      store.set(id, newCompletion);
      return newCompletion;
    },

    /**
     * Batch create multiple completions (for generating schedules)
     */
    async createMany(completions: NewRoutineStepCompletion[]): Promise<RoutineStepCompletion[]> {
      const created: RoutineStepCompletion[] = [];
      for (const completion of completions) {
        const result = await this.create(completion);
        created.push(result);
      }
      return created;
    },

    /**
     * Find all completions for a user
     */
    async findByUserId(userId: string): Promise<RoutineStepCompletion[]> {
      return Array.from(store.values())
        .filter((c) => c.userProfileId === userId)
        .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
    },

    /**
     * Find completions for a user within a date range
     */
    async findByUserAndDateRange(
      userId: string,
      startDate: Date,
      endDate: Date
    ): Promise<RoutineStepCompletion[]> {
      return Array.from(store.values())
        .filter(
          (c) =>
            c.userProfileId === userId &&
            c.scheduledDate >= startDate &&
            c.scheduledDate <= endDate
        )
        .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
    },

    /**
     * Find completions for a user on a specific date
     */
    async findByUserAndDate(userId: string, date: Date): Promise<RoutineStepCompletion[]> {
      // Match only the date part (ignore time)
      const targetDateStr = date.toISOString().split("T")[0];

      return Array.from(store.values())
        .filter((c) => {
          if (c.userProfileId !== userId) return false;
          const scheduledDateStr = c.scheduledDate.toISOString().split("T")[0];
          return scheduledDateStr === targetDateStr;
        })
        .sort((a, b) => {
          // Sort by timeOfDay (morning first)
          if (a.scheduledTimeOfDay !== b.scheduledTimeOfDay) {
            return a.scheduledTimeOfDay === "morning" ? -1 : 1;
          }
          return 0;
        });
    },

    /**
     * Find a single completion by ID
     */
    async findById(id: string): Promise<RoutineStepCompletion | null> {
      return store.get(id) ?? null;
    },

    /**
     * Update a completion record
     */
    async update(
      id: string,
      updates: Partial<Omit<RoutineStepCompletion, "id" | "createdAt">>
    ): Promise<RoutineStepCompletion | null> {
      const completion = store.get(id);
      if (!completion) return null;

      const updated = {
        ...completion,
        ...updates,
        updatedAt: new Date(),
      };
      store.set(id, updated);
      return updated;
    },

    /**
     * Update multiple completions by their IDs
     * Returns the number of updated records
     */
    async updateMany(
      ids: string[],
      updates: Partial<Omit<RoutineStepCompletion, "id" | "createdAt">>
    ): Promise<number> {
      let count = 0;
      for (const id of ids) {
        const result = await this.update(id, updates);
        if (result) count++;
      }
      return count;
    },

    /**
     * Update all pending completions that are past their grace period to 'missed'
     * Returns the number of updated records
     */
    async markOverdue(userId: string, now: Date): Promise<number> {
      const overdueCompletions = Array.from(store.values()).filter(
        (c) =>
          c.userProfileId === userId &&
          c.status === "pending" &&
          c.gracePeriodEnd < now
      );

      for (const completion of overdueCompletions) {
        await this.update(completion.id, {
          status: "missed",
          updatedAt: now,
        });
      }

      return overdueCompletions.length;
    },

    /**
     * Delete completions by routine product ID
     * Used when regenerating schedules after editing a product
     * Returns the number of deleted records
     */
    async deleteByRoutineProductId(
      routineProductId: string,
      fromDate?: Date,
      statuses?: ("pending" | "missed")[]
    ): Promise<number> {
      const toDelete = Array.from(store.values()).filter((c) => {
        if (c.routineProductId !== routineProductId) return false;
        if (fromDate && c.scheduledDate < fromDate) return false;
        if (statuses && !statuses.includes(c.status as "pending" | "missed")) return false;
        return true;
      });

      for (const completion of toDelete) {
        store.delete(completion.id);
      }

      return toDelete.length;
    },

    /**
     * Delete all completions for a user (for cleanup in tests)
     */
    async deleteByUserId(userId: string): Promise<number> {
      const toDelete = Array.from(store.values()).filter(
        (c) => c.userProfileId === userId
      );

      for (const completion of toDelete) {
        store.delete(completion.id);
      }

      return toDelete.length;
    },

    /**
     * Test helper to inspect state
     */
    _store: store,
  };
}
