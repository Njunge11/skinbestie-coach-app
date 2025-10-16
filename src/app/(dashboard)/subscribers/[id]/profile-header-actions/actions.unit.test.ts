import { describe, it, expect } from "vitest";
import { getUserProfile, updateUserProfile, type SubscriberDeps } from "./actions";
import { makeUserProfileRepoFake } from "./user-profile.repo.fake";

describe("Subscriber Server Actions - Unit Tests", () => {
  describe("getUserProfile", () => {
    it("returns user profile data when valid userId provided", async () => {
      const repo = makeUserProfileRepoFake();

      repo._store.set("user_1", {
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
        updatedAt: new Date("2024-01-01"),
      });

      const deps: SubscriberDeps = {
        repo,
        now: () => new Date("2025-01-15T12:00:00Z"),
        validateId: () => true,
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
      const repo = makeUserProfileRepoFake();

      repo._store.set("user_2", {
        id: "user_2",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1997-05-15"),
        skinType: null,
        concerns: null,
        occupation: null,
        bio: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: SubscriberDeps = {
        repo,
        now: () => new Date("2025-01-15T12:00:00Z"),
        validateId: () => true,
      };

      const result = await getUserProfile("user_2", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.age).toBe(27);
      }
    });

    it("handles missing optional fields gracefully", async () => {
      const repo = makeUserProfileRepoFake();

      repo._store.set("user_3", {
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
        updatedAt: new Date("2024-01-01"),
      });

      const deps: SubscriberDeps = {
        repo,
        now: () => new Date("2025-01-15T12:00:00Z"),
        validateId: () => true,
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
      const repo = makeUserProfileRepoFake();

      repo._store.set("user_4", {
        id: "user_4",
        firstName: "Sarah",
        lastName: "Chen",
        email: "sarah@example.com",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
        skinType: null,
        concerns: null,
        occupation: null,
        bio: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: SubscriberDeps = {
        repo,
        now: () => new Date("2025-01-15T12:00:00Z"),
        validateId: () => true,
      };

      const result = await getUserProfile("user_4", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.name).toBe("Sarah Chen");
      }
    });

    it("returns error when userId is invalid format", async () => {
      const deps: SubscriberDeps = {
        repo: makeUserProfileRepoFake(),
        now: () => new Date("2025-01-15T12:00:00Z"),
        validateId: () => false,
      };

      const result = await getUserProfile("not-a-uuid", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid user ID");
      }
    });

    it("returns error when user not found", async () => {
      const repo = makeUserProfileRepoFake();
      // No user in store

      const deps: SubscriberDeps = {
        repo,
        now: () => new Date("2025-01-15T12:00:00Z"),
        validateId: () => true,
      };

      const result = await getUserProfile("nonexistent_id", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User not found");
      }
    });
  });

  describe("updateUserProfile", () => {
    it("updates occupation successfully", async () => {
      const repo = makeUserProfileRepoFake();

      repo._store.set("user_1", {
        id: "user_1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
        skinType: null,
        concerns: null,
        occupation: "Old Job",
        bio: "Old bio",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: SubscriberDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const result = await updateUserProfile("user_1", { occupation: "Software Engineer" }, deps);

      expect(result.success).toBe(true);
      expect(repo._store.get("user_1")!.occupation).toBe("Software Engineer");
    });

    it("updates bio successfully", async () => {
      const repo = makeUserProfileRepoFake();

      repo._store.set("user_2", {
        id: "user_2",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
        skinType: null,
        concerns: null,
        occupation: "Job",
        bio: "Old bio",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: SubscriberDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const result = await updateUserProfile("user_2", { bio: "Loves skincare" }, deps);

      expect(result.success).toBe(true);
      expect(repo._store.get("user_2")!.bio).toBe("Loves skincare");
    });

    it("updates both occupation and bio successfully", async () => {
      const repo = makeUserProfileRepoFake();

      repo._store.set("user_3", {
        id: "user_3",
        firstName: "Bob",
        lastName: "Jones",
        email: "bob@example.com",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
        skinType: null,
        concerns: null,
        occupation: "Old Job",
        bio: "Old bio",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: SubscriberDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const result = await updateUserProfile(
        "user_3",
        { occupation: "Teacher", bio: "New bio" },
        deps
      );

      expect(result.success).toBe(true);
      expect(repo._store.get("user_3")!.occupation).toBe("Teacher");
      expect(repo._store.get("user_3")!.bio).toBe("New bio");
    });

    it("updates updatedAt timestamp", async () => {
      const repo = makeUserProfileRepoFake();

      repo._store.set("user_4", {
        id: "user_4",
        firstName: "Alice",
        lastName: "Brown",
        email: "alice@example.com",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
        skinType: null,
        concerns: null,
        occupation: "Job",
        bio: "Bio",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const fixedNow = new Date("2025-01-15T10:30:00Z");
      const deps: SubscriberDeps = {
        repo,
        now: () => fixedNow,
        validateId: () => true,
      };

      const result = await updateUserProfile("user_4", { occupation: "New Job" }, deps);

      expect(result.success).toBe(true);
      expect(repo._store.get("user_4")!.updatedAt).toEqual(fixedNow);
    });

    it("returns error when userId is invalid format", async () => {
      const deps: SubscriberDeps = {
        repo: makeUserProfileRepoFake(),
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => false,
      };

      const result = await updateUserProfile("not-a-uuid", { occupation: "Test" }, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("handles empty data object", async () => {
      const repo = makeUserProfileRepoFake();

      repo._store.set("user_5", {
        id: "user_5",
        firstName: "Charlie",
        lastName: "Wilson",
        email: "charlie@example.com",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
        skinType: null,
        concerns: null,
        occupation: "Job",
        bio: "Bio",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const deps: SubscriberDeps = {
        repo,
        now: () => new Date("2025-01-15T10:30:00Z"),
        validateId: () => true,
      };

      const result = await updateUserProfile("user_5", {}, deps);

      expect(result.success).toBe(true);
    });
  });
});
