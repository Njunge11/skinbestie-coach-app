// Fake repository for testing (uses Map for in-memory storage)
export function makeUserProfilesRepoFake() {
  const store = new Map<string, any>();
  let idCounter = 1;

  return {
    // For test inspection
    _store: store,

    async findById(id: string) {
      return store.get(id) || null;
    },

    async findByEmail(email: string) {
      for (const profile of store.values()) {
        if (profile.email === email) return profile;
      }
      return null;
    },

    async findByEmailAndPhone(email: string, phoneNumber: string) {
      for (const profile of store.values()) {
        if (profile.email === email && profile.phoneNumber === phoneNumber) {
          return profile;
        }
      }
      return null;
    },

    async findByEmailOrPhone(email: string, phoneNumber: string) {
      for (const profile of store.values()) {
        if (profile.email === email || profile.phoneNumber === phoneNumber) {
          return profile;
        }
      }
      return null;
    },

    async create(data: any) {
      const id = `user-${idCounter++}`;
      const profile = {
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        isCompleted: false,
        completedAt: null,
        skinType: null,
        concerns: null,
        hasAllergies: null,
        allergyDetails: null,
        isSubscribed: null,
        hasCompletedBooking: null,
        ...data, // Data comes last to override defaults
      };
      store.set(id, profile);
      return profile;
    },

    async update(id: string, data: any) {
      const existing = store.get(id);
      if (!existing) return null;

      const updated = {
        ...existing,
        ...data,
      };
      store.set(id, updated);
      return updated;
    },

    async findMany(filters: {
      searchQuery?: string;
      completionStatus?: string;
      subscriptionStatus?: string;
      dateRangeStart?: Date;
      sortBy?: string;
      sortOrder?: string;
      limit?: number;
      offset?: number;
    }) {
      let profiles = Array.from(store.values());

      // Apply search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        profiles = profiles.filter(
          (p) =>
            p.firstName.toLowerCase().includes(query) ||
            p.lastName.toLowerCase().includes(query) ||
            p.email.toLowerCase().includes(query)
        );
      }

      // Apply completion status filter
      if (filters.completionStatus === "completed") {
        profiles = profiles.filter((p) => p.isCompleted === true);
      } else if (filters.completionStatus === "incomplete") {
        profiles = profiles.filter((p) => p.isCompleted === false);
      }

      // Apply subscription status filter
      if (filters.subscriptionStatus === "subscribed") {
        profiles = profiles.filter((p) => p.isSubscribed === true);
      } else if (filters.subscriptionStatus === "not_subscribed") {
        profiles = profiles.filter((p) => p.isSubscribed === false || p.isSubscribed === null);
      }

      // Apply date range filter
      if (filters.dateRangeStart) {
        profiles = profiles.filter((p) => p.createdAt >= filters.dateRangeStart);
      }

      // Apply sorting
      const sortBy = filters.sortBy || "createdAt";
      const sortOrder = filters.sortOrder || "desc";

      profiles.sort((a, b) => {
        let aVal, bVal;

        if (sortBy === "name") {
          aVal = `${a.firstName} ${a.lastName}`;
          bVal = `${b.firstName} ${b.lastName}`;
        } else if (sortBy === "email") {
          aVal = a.email;
          bVal = b.email;
        } else {
          aVal = a.createdAt;
          bVal = b.createdAt;
        }

        if (sortOrder === "asc") {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      const totalCount = profiles.length;

      // Apply pagination
      if (filters.offset !== undefined && filters.limit !== undefined) {
        profiles = profiles.slice(filters.offset, filters.offset + filters.limit);
      }

      return { profiles, totalCount };
    },
  };
}
