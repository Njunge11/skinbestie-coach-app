// Fake repository for unit testing (follows TESTING.md)

export type Goal = {
  id: string;
  userProfileId: string;
  name: string;
  description: string;
  timeframe: string;
  complete: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

export type NewGoal = Omit<Goal, 'id'>;

export function makeGoalsRepoFake() {
  const store = new Map<string, Goal>();
  let idCounter = 0;

  return {
    async findByUserId(userId: string): Promise<Goal[]> {
      const goals = Array.from(store.values())
        .filter((g) => g.userProfileId === userId)
        .sort((a, b) => a.order - b.order);
      return goals;
    },

    async create(goal: NewGoal): Promise<Goal> {
      const id = `goal_${++idCounter}`;
      const newGoal: Goal = { ...goal, id };
      store.set(id, newGoal);
      return newGoal;
    },

    async update(goalId: string, updates: Partial<Goal>): Promise<Goal | null> {
      const goal = store.get(goalId);
      if (!goal) return null;

      Object.assign(goal, updates);
      return goal;
    },

    async deleteById(goalId: string): Promise<Goal | null> {
      const goal = store.get(goalId);
      if (!goal) return null;

      store.delete(goalId);
      return goal;
    },

    async updateMany(updates: Array<{ id: string; data: Partial<Goal> }>): Promise<void> {
      for (const { id, data } of updates) {
        const goal = store.get(id);
        if (goal) {
          Object.assign(goal, data);
        }
      }
    },

    // Test helper to inspect state
    _store: store,
  };
}
