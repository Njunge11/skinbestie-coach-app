import { describe, it, expect, vi } from "vitest";
import { getUserProfile, updateUserProfile, type SubscriberDeps } from "./actions";

// Fake database
function makeFakeDb() {
  const store = new Map<string, any>();

  return {
    select: () => ({
      from: () => ({
        where: (condition: any) => ({
          limit: async (n: number) => {
            const entries = Array.from(store.values());
            return entries.slice(0, n);
          },
        }),
      }),
    }),
    update: () => ({
      set: (data: any) => {
        // Track what was set for assertions
        return {
          where: (condition: any) => {
            // Apply update to first matching record
            const entry = Array.from(store.values())[0];
            if (entry) {
              Object.assign(entry, data);
            }
            return Promise.resolve();
          },
          _updateData: data, // For test inspection
        };
      },
    }),
    _store: store, // For test setup
  };
}

describe("Subscriber Server Actions - Unit Tests", () => {
  describe("getUserProfile", () => {
    it("returns user profile data when valid userId provided", async () => {
      const fakeDb = makeFakeDb() as any;
      fakeDb._store.set("user_1", {
        id: "user_1",
        firstName: "Sarah",
        lastName: "Chen",
        email: "sarah@example.com",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1997-05-15"),
        skinType: ["Combination"],
        concerns: ["Acne", "Dark Spots"],
        occupation: "Software Engineer",
        bio: "Love skincare",
        createdAt: new Date("2024-01-01"),
      });

      fakeDb.select = () => ({
        from: () => ({
          where: () => ({
            limit: async () => [fakeDb._store.get("user_1")],
          }),
        }),
      });

      const deps: SubscriberDeps = {
        db: fakeDb,
        now: () => new Date("2025-01-15T12:00:00Z"),
        validateId: () => true, // Accept any ID in tests
      };

      const result = await getUserProfile("user_1", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          id: "user_1",
          name: "Sarah Chen",
          email: "sarah@example.com",
          mobile: "+1234567890",
          age: 27,
          skinType: "Combination",
          concerns: ["Acne", "Dark Spots"],
          occupation: "Software Engineer",
          bio: "Love skincare",
        });
      }
    });

    it("calculates age correctly from date of birth", async () => {
      const fakeDb = makeFakeDb() as any;
      fakeDb._store.set("user_2", {
        id: "user_2",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1997-05-15"),
        createdAt: new Date("2024-01-01"),
      });

      fakeDb.select = () => ({
        from: () => ({
          where: () => ({
            limit: async () => [fakeDb._store.get("user_2")],
          }),
        }),
      });

      const deps: SubscriberDeps = {
        db: fakeDb,
        now: () => new Date("2025-01-15T12:00:00Z"),
        validateId: () => true, // Accept any ID in tests
      };

      const result = await getUserProfile("user_2", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.age).toBe(27);
      }
    });

    it("handles missing optional fields gracefully", async () => {
      const fakeDb = makeFakeDb() as any;
      fakeDb._store.set("user_3", {
        id: "user_3",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
        skinType: null,
        concerns: null,
        occupation: null,
        bio: null,
        createdAt: new Date("2024-01-01"),
      });

      fakeDb.select = () => ({
        from: () => ({
          where: () => ({
            limit: async () => [fakeDb._store.get("user_3")],
          }),
        }),
      });

      const deps: SubscriberDeps = {
        db: fakeDb,
        now: () => new Date("2025-01-15T12:00:00Z"),
        validateId: () => true, // Accept any ID in tests
      };

      const result = await getUserProfile("user_3", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.occupation).toBe("");
        expect(result.data?.bio).toBe("");
        expect(result.data?.concerns).toEqual([]);
        expect(result.data?.skinType).toBe("Not specified");
      }
    });

    it("combines firstName and lastName into name", async () => {
      const fakeDb = makeFakeDb() as any;
      fakeDb._store.set("user_4", {
        id: "user_4",
        firstName: "Sarah",
        lastName: "Chen",
        email: "sarah@example.com",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
        createdAt: new Date("2024-01-01"),
      });

      fakeDb.select = () => ({
        from: () => ({
          where: () => ({
            limit: async () => [fakeDb._store.get("user_4")],
          }),
        }),
      });

      const deps: SubscriberDeps = {
        db: fakeDb,
        now: () => new Date("2025-01-15T12:00:00Z"),
        validateId: () => true, // Accept any ID in tests
      };

      const result = await getUserProfile("user_4", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.name).toBe("Sarah Chen");
      }
    });

    it("returns error when userId is invalid format", async () => {
      const deps: SubscriberDeps = {
        db: makeFakeDb() as any,
        now: () => new Date("2025-01-15T12:00:00Z"),
      };

      const result = await getUserProfile("not-a-uuid", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid user ID");
      }
    });

    it("returns error when user not found", async () => {
      const fakeDb = makeFakeDb() as any;
      fakeDb.select = () => ({
        from: () => ({
          where: () => ({
            limit: async () => [], // No user found
          }),
        }),
      });

      const deps: SubscriberDeps = {
        db: fakeDb,
        now: () => new Date("2025-01-15T12:00:00Z"),
        validateId: () => true, // Accept any ID in tests
      };

      const result = await getUserProfile("550e8400-e29b-41d4-a716-446655440000", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User not found");
      }
    });
  });

  describe("updateUserProfile", () => {
    it("updates occupation successfully", async () => {
      const fakeDb = makeFakeDb() as any;
      const user = {
        id: "user_1",
        occupation: "Old Job",
        bio: "Old bio",
        updatedAt: new Date("2024-01-01"),
      };
      fakeDb._store.set("user_1", user);

      const deps: SubscriberDeps = {
        db: fakeDb,
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true, // Accept any ID in tests
      };

      const result = await updateUserProfile("user_1", { occupation: "Software Engineer" }, deps);

      expect(result.success).toBe(true);
      expect(user.occupation).toBe("Software Engineer");
    });

    it("updates bio successfully", async () => {
      const fakeDb = makeFakeDb() as any;
      const user = {
        id: "user_2",
        occupation: "Job",
        bio: "Old bio",
        updatedAt: new Date("2024-01-01"),
      };
      fakeDb._store.set("user_2", user);

      const deps: SubscriberDeps = {
        db: fakeDb,
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true, // Accept any ID in tests
      };

      const result = await updateUserProfile("user_2", { bio: "Loves skincare" }, deps);

      expect(result.success).toBe(true);
      expect(user.bio).toBe("Loves skincare");
    });

    it("updates both occupation and bio successfully", async () => {
      const fakeDb = makeFakeDb() as any;
      const user = {
        id: "user_3",
        occupation: "Old Job",
        bio: "Old bio",
        updatedAt: new Date("2024-01-01"),
      };
      fakeDb._store.set("user_3", user);

      const deps: SubscriberDeps = {
        db: fakeDb,
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true, // Accept any ID in tests
      };

      const result = await updateUserProfile(
        "user_3",
        { occupation: "Teacher", bio: "New bio" },
        deps
      );

      expect(result.success).toBe(true);
      expect(user.occupation).toBe("Teacher");
      expect(user.bio).toBe("New bio");
    });

    it("updates updatedAt timestamp", async () => {
      const fakeDb = makeFakeDb() as any;
      const user = {
        id: "user_4",
        occupation: "Job",
        bio: "Bio",
        updatedAt: new Date("2024-01-01"),
      };
      fakeDb._store.set("user_4", user);

      const fixedNow = new Date("2025-01-15T10:30:00Z");
      const deps: SubscriberDeps = {
        db: fakeDb,
        now: () => fixedNow,
        validateId: () => true, // Accept any ID in tests
      };

      const result = await updateUserProfile("user_4", { occupation: "New Job" }, deps);

      expect(result.success).toBe(true);
      expect(user.updatedAt).toEqual(fixedNow);
    });

    it("returns error when userId is invalid format", async () => {
      const deps: SubscriberDeps = {
        db: makeFakeDb() as any,
        now: () => new Date("2025-01-15T10:30:00Z"),
      };

      const result = await updateUserProfile("not-a-uuid", { occupation: "Test" }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("handles empty data object", async () => {
      const fakeDb = makeFakeDb() as any;
      const user = {
        id: "user_5",
        occupation: "Job",
        bio: "Bio",
        updatedAt: new Date("2024-01-01"),
      };
      fakeDb._store.set("user_5", user);

      const deps: SubscriberDeps = {
        db: fakeDb,
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true, // Accept any ID in tests
      };

      const result = await updateUserProfile("user_5", {}, deps);

      expect(result.success).toBe(true);
    });
  });
});
