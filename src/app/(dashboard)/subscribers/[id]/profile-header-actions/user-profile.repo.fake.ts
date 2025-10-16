// Fake repository for unit testing (follows TESTING.md)

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: Date;
  skinType: string[] | null;
  concerns: string[] | null;
  occupation: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function makeUserProfileRepoFake() {
  const store = new Map<string, UserProfile>();

  return {
    async getById(id: string): Promise<UserProfile | null> {
      return store.get(id) || null;
    },

    async update(id: string, updates: Partial<UserProfile>): Promise<void> {
      const user = store.get(id);
      if (user) {
        Object.assign(user, updates);
      }
    },

    // Test helper to setup state
    _store: store,
  };
}
