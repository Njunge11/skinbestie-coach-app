import { describe, it, expect } from "vitest";
import {
  createUserProfile,
  getUserProfileById,
  getUserProfileByEmail,
  checkUserProfileExists,
  updateUserProfile,
  getUserProfiles,
  type UserProfileDeps,
} from "./actions";

// Fake database with proper query logic
function makeFakeDb() {
  const store = new Map<string, any>();

  return {
    query: {
      userProfiles: {
        findFirst: async ({ where }: any) => {
          // Execute the where callback to get filter condition
          const entries = Array.from(store.values());

          // Simple implementation: test each entry against the where clause
          for (const entry of entries) {
            try {
              // Create a mock account object and operators
              const acct = entry;
              const eq = (field: any, value: any) => field === value;
              const and = (...conditions: boolean[]) => conditions.every(c => c);
              const or = (...conditions: boolean[]) => conditions.some(c => c);

              // Call the where function
              const result = where(acct, { eq, and, or });

              // If result is true, this entry matches
              if (result) {
                return entry;
              }
            } catch {
              // If where logic fails, skip this entry
              continue;
            }
          }

          return null;
        },
      },
    },
    insert: () => ({
      values: (data: any) => ({
        returning: async () => {
          const profile = {
            ...data,
            id: `profile_${store.size + 1}`,
            createdAt: new Date("2025-01-01T12:00:00Z"),
            updatedAt: new Date("2025-01-01T12:00:00Z"),
          };
          store.set(profile.id, profile);
          return [profile];
        },
      }),
    }),
    update: (table: any) => ({
      set: (data: any) => {
        let updateId: string | null = null;
        return {
          where: (condition: any) => {
            // Extract the ID from the condition
            // The condition is the result of eq(userProfiles.id, id)
            // We need to find which entry to update
            try {
              // Try to get the ID value from various condition structures
              updateId = condition?.right || condition?._data?.right || null;
            } catch {
              // If we can't extract it, we'll check all entries
            }

            return {
              returning: async () => {
                // If we have a specific ID, update that entry
                if (updateId && store.has(updateId)) {
                  const entry = store.get(updateId);
                  const updated = { ...entry, ...data };
                  store.set(updateId, updated);
                  return [updated];
                }

                // Otherwise, try to find a match (fallback for first entry)
                for (const [id, entry] of store.entries()) {
                  const updated = { ...entry, ...data };
                  store.set(id, updated);
                  return [updated];
                }

                return [];
              },
            };
          },
        };
      },
    }),
    select: (columns?: any) => {
      // Check if this is a count query
      const isCountQuery = columns && columns.count;

      return {
        from: (table: any) => ({
          where: (clause: any) => {
            if (isCountQuery) {
              // Count query - return total count
              return Promise.resolve([{ count: store.size }]);
            }

            // Regular select query
            return {
              orderBy: (order: any) => ({
                limit: (lim: number) => ({
                  offset: (off: number) => {
                    // Apply pagination to store
                    const results = Array.from(store.values());
                    const start = off;
                    const end = start + lim;
                    return Promise.resolve(results.slice(start, end));
                  },
                }),
              }),
            };
          },
        }),
      };
    },
    _store: store, // For test setup
  };
}

describe("User Profile Actions - Unit Tests", () => {
  const fixedNow = () => new Date("2025-01-01T12:00:00Z");

  describe("createUserProfile", () => {
    it("creates profile when valid data provided", async () => {
      const fakeDb = makeFakeDb() as any;
      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await createUserProfile(
        {
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@example.com",
          phoneNumber: "+1234567890",
          dateOfBirth: "1990-01-01",
        },
        deps
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe("Jane");
        expect(result.data.lastName).toBe("Doe");
        expect(result.data.email).toBe("jane@example.com");
        expect(result.data.phoneNumber).toBe("+1234567890");
        expect(result.data.completedSteps).toEqual(["PERSONAL"]);
      }
    });

    it("normalizes email to lowercase", async () => {
      const fakeDb = makeFakeDb() as any;
      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await createUserProfile(
        {
          firstName: "Jane",
          lastName: "Doe",
          email: "JANE@EXAMPLE.COM",
          phoneNumber: "+1234567890",
          dateOfBirth: "1990-01-01",
        },
        deps
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("jane@example.com");
      }
    });

    it("trims phone number whitespace", async () => {
      const fakeDb = makeFakeDb() as any;
      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await createUserProfile(
        {
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@example.com",
          phoneNumber: "  +1234567890  ",
          dateOfBirth: "1990-01-01",
        },
        deps
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phoneNumber).toBe("+1234567890");
      }
    });

    it("converts date string to Date object", async () => {
      const fakeDb = makeFakeDb() as any;
      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await createUserProfile(
        {
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@example.com",
          phoneNumber: "+1234567890",
          dateOfBirth: "1990-05-15",
        },
        deps
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dateOfBirth).toBeInstanceOf(Date);
        expect(result.data.dateOfBirth.toISOString()).toBe(
          "1990-05-15T00:00:00.000Z"
        );
      }
    });

    it("rejects invalid email format", async () => {
      const fakeDb = makeFakeDb() as any;
      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await createUserProfile(
        {
          firstName: "Jane",
          lastName: "Doe",
          email: "invalid-email",
          phoneNumber: "+1234567890",
          dateOfBirth: "1990-01-01",
        },
        deps
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid input data");
      }
    });

    it("rejects invalid date format", async () => {
      const fakeDb = makeFakeDb() as any;
      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await createUserProfile(
        {
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@example.com",
          phoneNumber: "+1234567890",
          dateOfBirth: "01/01/1990", // Wrong format
        },
        deps
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid input data");
      }
    });

    it("rejects phone number that is too short", async () => {
      const fakeDb = makeFakeDb() as any;
      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await createUserProfile(
        {
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@example.com",
          phoneNumber: "123", // Too short
          dateOfBirth: "1990-01-01",
        },
        deps
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid input data");
      }
    });

    it("handles exact match - allows resume with existing profile", async () => {
      const fakeDb = makeFakeDb() as any;
      const existingProfile = {
        id: "existing-id",
        email: "jane@example.com",
        phoneNumber: "+1234567890",
        firstName: "Jane",
        lastName: "Doe",
        dateOfBirth: new Date("1990-01-01"),
        completedSteps: ["PERSONAL", "SKIN_TYPE"],
        skinType: ["oily"],
        concerns: null,
        hasAllergies: null,
        allergyDetails: null,
        isSubscribed: null,
        hasCompletedBooking: null,
        isCompleted: false,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      fakeDb._store.set("existing-id", existingProfile);

      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await createUserProfile(
        {
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@example.com",
          phoneNumber: "+1234567890",
          dateOfBirth: "1990-01-01",
        },
        deps
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("existing-id");
        expect(result.data.completedSteps).toEqual(["PERSONAL", "SKIN_TYPE"]);
        expect(result.data.skinType).toEqual(["oily"]);
        // Security: should not return PII
        expect(result.data.firstName).toBe("");
        expect(result.data.lastName).toBe("");
        expect(result.data.email).toBe("");
        expect(result.data.phoneNumber).toBe("");
      }
    });

    it("returns error when email is already taken with different phone", async () => {
      const fakeDb = makeFakeDb() as any;
      // Add existing profile with same email but different phone
      fakeDb._store.set("existing-id", {
        id: "existing-id",
        email: "jane@example.com",
        phoneNumber: "+9999999999", // Different phone
        firstName: "Jane",
        lastName: "Doe",
      });

      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await createUserProfile(
        {
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@example.com",
          phoneNumber: "+1234567890", // Different phone
          dateOfBirth: "1990-01-01",
        },
        deps
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "Email is already registered with different details"
        );
      }
    });

    it("returns error when phone is already taken with different email", async () => {
      const fakeDb = makeFakeDb() as any;
      // Add existing profile with same phone but different email
      fakeDb._store.set("existing-id", {
        id: "existing-id",
        email: "other@example.com", // Different email
        phoneNumber: "+1234567890",
        firstName: "Other",
        lastName: "Person",
      });

      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await createUserProfile(
        {
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@example.com", // Different email
          phoneNumber: "+1234567890",
          dateOfBirth: "1990-01-01",
        },
        deps
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "Phone number is already registered with different details"
        );
      }
    });
  });

  describe("getUserProfileById", () => {
    it("returns profile when found", async () => {
      const fakeDb = makeFakeDb() as any;
      const profile = {
        id: "profile-123",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
      };
      fakeDb._store.set("profile-123", profile);

      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await getUserProfileById("profile-123", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("profile-123");
        expect(result.data.firstName).toBe("Jane");
      }
    });

    it("returns error when profile not found", async () => {
      const fakeDb = makeFakeDb() as any;
      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await getUserProfileById("nonexistent-id", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Profile not found");
      }
    });
  });

  describe("getUserProfileByEmail", () => {
    it("returns profile when found", async () => {
      const fakeDb = makeFakeDb() as any;
      const profile = {
        id: "profile-123",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
      };
      fakeDb._store.set("profile-123", profile);

      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await getUserProfileByEmail("jane@example.com", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("jane@example.com");
      }
    });

    it("normalizes email before search", async () => {
      const fakeDb = makeFakeDb() as any;
      const profile = {
        id: "profile-123",
        email: "jane@example.com",
      };
      fakeDb._store.set("profile-123", profile);

      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await getUserProfileByEmail("  JANE@EXAMPLE.COM  ", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("jane@example.com");
      }
    });

    it("returns error when profile not found", async () => {
      const fakeDb = makeFakeDb() as any;
      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await getUserProfileByEmail("nonexistent@example.com", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Profile not found");
      }
    });
  });

  describe("checkUserProfileExists", () => {
    it("returns exists=true when profile found by email", async () => {
      const fakeDb = makeFakeDb() as any;
      const profile = {
        id: "profile-123",
        email: "jane@example.com",
      };
      fakeDb._store.set("profile-123", profile);

      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await checkUserProfileExists(
        { email: "jane@example.com" },
        deps
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.exists).toBe(true);
        expect(result.data.profile).toEqual(profile);
      }
    });

    it("returns exists=false when profile not found", async () => {
      const fakeDb = makeFakeDb() as any;
      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await checkUserProfileExists(
        { email: "nonexistent@example.com" },
        deps
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.exists).toBe(false);
        expect(result.data.profile).toBeNull();
      }
    });

    it("returns error when neither email nor phone provided", async () => {
      const fakeDb = makeFakeDb() as any;
      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await checkUserProfileExists({}, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "Either email or phoneNumber must be provided"
        );
      }
    });
  });

  describe("updateUserProfile", () => {
    it("updates profile with valid data", async () => {
      const fakeDb = makeFakeDb() as any;
      const existing = {
        id: "profile-123",
        firstName: "Jane",
        lastName: "Doe",
        completedSteps: ["PERSONAL"],
      };
      fakeDb._store.set("profile-123", existing);

      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await updateUserProfile(
        "profile-123",
        {
          skinType: ["oily", "combination"],
          completedSteps: ["PERSONAL", "SKIN_TYPE"],
        },
        deps
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.skinType).toEqual(["oily", "combination"]);
        expect(result.data.completedSteps).toEqual(["PERSONAL", "SKIN_TYPE"]);
        expect(result.data.updatedAt).toEqual(fixedNow());
      }
    });

    it("converts completedAt string to Date", async () => {
      const fakeDb = makeFakeDb() as any;
      const existing = {
        id: "profile-123",
        isCompleted: true,
      };
      fakeDb._store.set("profile-123", existing);

      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await updateUserProfile(
        "profile-123",
        {
          isCompleted: true,
          completedAt: "2025-01-01T12:00:00Z",
        },
        deps
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.completedAt).toBeInstanceOf(Date);
      }
    });

    it("returns error when profile not found", async () => {
      const fakeDb = makeFakeDb() as any;
      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await updateUserProfile(
        "nonexistent-id",
        { skinType: ["oily"] },
        deps
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Profile not found");
      }
    });

    it("uses fixed time for updatedAt", async () => {
      const fakeDb = makeFakeDb() as any;
      const existing = {
        id: "profile-123",
        firstName: "Jane",
      };
      fakeDb._store.set("profile-123", existing);

      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await updateUserProfile(
        "profile-123",
        { skinType: ["oily"] },
        deps
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Verify updatedAt uses fixed time
        expect(result.data.updatedAt.toISOString()).toBe("2025-01-01T12:00:00.000Z");
      }
    });
  });

  describe("getUserProfiles", () => {
    it("returns paginated profiles with default settings", async () => {
      const fakeDb = makeFakeDb() as any;
      // Add 25 profiles
      for (let i = 1; i <= 25; i++) {
        fakeDb._store.set(`profile-${i}`, {
          id: `profile-${i}`,
          firstName: `User${i}`,
          lastName: "Test",
          email: `user${i}@example.com`,
          isCompleted: false,
          createdAt: new Date("2025-01-01T12:00:00Z"),
        });
      }

      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await getUserProfiles({}, { page: 0, pageSize: 20 }, {}, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.profiles).toHaveLength(20);
        expect(result.data.totalCount).toBe(25);
        expect(result.data.page).toBe(0);
        expect(result.data.pageSize).toBe(20);
        expect(result.data.totalPages).toBe(2);
      }
    });

    it("returns second page of results", async () => {
      const fakeDb = makeFakeDb() as any;
      // Add 25 profiles
      for (let i = 1; i <= 25; i++) {
        fakeDb._store.set(`profile-${i}`, {
          id: `profile-${i}`,
          firstName: `User${i}`,
          lastName: "Test",
          email: `user${i}@example.com`,
          isCompleted: false,
          createdAt: new Date("2025-01-01T12:00:00Z"),
        });
      }

      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await getUserProfiles({}, { page: 1, pageSize: 20 }, {}, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.profiles).toHaveLength(5); // Remaining 5 profiles
        expect(result.data.totalCount).toBe(25);
        expect(result.data.page).toBe(1);
      }
    });

    it("returns empty array when no profiles exist", async () => {
      const fakeDb = makeFakeDb() as any;
      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await getUserProfiles({}, { page: 0, pageSize: 20 }, {}, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.profiles).toHaveLength(0);
        expect(result.data.totalCount).toBe(0);
        expect(result.data.totalPages).toBe(0);
      }
    });

    it("respects custom page size", async () => {
      const fakeDb = makeFakeDb() as any;
      // Add 50 profiles
      for (let i = 1; i <= 50; i++) {
        fakeDb._store.set(`profile-${i}`, {
          id: `profile-${i}`,
          firstName: `User${i}`,
          lastName: "Test",
          email: `user${i}@example.com`,
        });
      }

      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await getUserProfiles({}, { page: 0, pageSize: 10 }, {}, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.profiles).toHaveLength(10);
        expect(result.data.totalCount).toBe(50);
        expect(result.data.totalPages).toBe(5);
      }
    });

    it("calculates total pages correctly", async () => {
      const fakeDb = makeFakeDb() as any;
      // Add exactly 20 profiles (1 page)
      for (let i = 1; i <= 20; i++) {
        fakeDb._store.set(`profile-${i}`, {
          id: `profile-${i}`,
          firstName: `User${i}`,
          lastName: "Test",
          email: `user${i}@example.com`,
        });
      }

      const deps: UserProfileDeps = { db: fakeDb, now: fixedNow };

      const result = await getUserProfiles({}, { page: 0, pageSize: 20 }, {}, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalPages).toBe(1);
      }
    });
  });
});
