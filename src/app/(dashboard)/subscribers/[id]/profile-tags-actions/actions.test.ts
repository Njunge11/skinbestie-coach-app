import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  addProfileTag,
  removeProfileTag,
  type ProfileTagsDeps,
} from "./actions";
import {
  makeProfileTagsRepoFake,
  type ProfileTagsRepo,
} from "./profile-tags.repo.fake";

// Mock next/cache revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Profile Tags Actions - Unit Tests", () => {
  // Test UUIDs
  const user1Id = "550e8400-e29b-41d4-a716-446655440000";
  const user2Id = "550e8400-e29b-41d4-a716-446655440001";
  const tag1Id = "850e8400-e29b-41d4-a716-446655440001";
  const tag2Id = "850e8400-e29b-41d4-a716-446655440002";

  let repo: ProfileTagsRepo;
  let deps: ProfileTagsDeps;

  beforeEach(() => {
    repo = makeProfileTagsRepoFake();
    deps = { repo };
  });

  describe("addProfileTag", () => {
    it("creates tag successfully with valid data", async () => {
      const result = await addProfileTag(user1Id, "Acne", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.userProfileId).toBe(user1Id);
        expect(result.data.tag).toBe("Acne");
        expect(result.data.id).toBeDefined();
        expect(result.data.createdAt).toBeInstanceOf(Date);
      }
    });

    it("trims whitespace from tag before saving", async () => {
      const result = await addProfileTag(user1Id, "  Acne  ", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tag).toBe("Acne");
      }
    });

    it("returns error when tag is empty string", async () => {
      const result = await addProfileTag(user1Id, "", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Tag cannot be empty");
      }
    });

    it("returns error when tag is whitespace only", async () => {
      const result = await addProfileTag(user1Id, "   ", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Tag cannot be empty");
      }
    });

    it("returns error when tag exceeds 100 characters", async () => {
      const longTag = "a".repeat(101);
      const result = await addProfileTag(user1Id, longTag, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Tag must be 100 characters or less");
      }
    });

    it("returns error when duplicate tag exists (case-insensitive)", async () => {
      // Manually set up existing tag
      repo._store.set(tag1Id, {
        id: tag1Id,
        userProfileId: user1Id,
        tag: "Acne",
        createdAt: new Date("2025-01-01"),
      });

      // Try to add same tag with different case
      const result = await addProfileTag(user1Id, "acne", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Tag already exists");
      }
    });

    it("allows same tag for different users", async () => {
      // User 1 has "Acne" tag
      repo._store.set(tag1Id, {
        id: tag1Id,
        userProfileId: user1Id,
        tag: "Acne",
        createdAt: new Date("2025-01-01"),
      });

      // User 2 can add "Acne" tag
      const result = await addProfileTag(user2Id, "Acne", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.userProfileId).toBe(user2Id);
        expect(result.data.tag).toBe("Acne");
      }
    });

    it("handles repository errors gracefully", async () => {
      // Mock repo to throw error
      repo.create = async () => {
        throw new Error("Database connection failed");
      };

      const result = await addProfileTag(user1Id, "Acne", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to add tag");
      }
    });
  });

  describe("removeProfileTag", () => {
    it("removes tag successfully", async () => {
      // Manually set up tag to delete
      repo._store.set(tag1Id, {
        id: tag1Id,
        userProfileId: user1Id,
        tag: "Acne",
        createdAt: new Date("2025-01-01"),
      });

      const result = await removeProfileTag(tag1Id, user1Id, deps);

      expect(result.success).toBe(true);
      expect(repo._store.has(tag1Id)).toBe(false);
    });

    it("returns error when tag not found", async () => {
      const result = await removeProfileTag("non-existent-id", user1Id, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Tag not found");
      }
    });

    it("returns error when tagId is empty", async () => {
      const result = await removeProfileTag("", user1Id, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid tag ID");
      }
    });

    it("handles repository errors gracefully", async () => {
      // Mock repo to throw error
      repo.delete = async () => {
        throw new Error("Database connection failed");
      };

      const result = await removeProfileTag(tag1Id, user1Id, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to remove tag");
      }
    });
  });
});
