import { describe, it, expect } from "vitest";
import {
  getProgressPhotos,
  getProgressPhotosByWeek,
  createProgressPhoto,
  updatePhotoFeedback,
  deleteProgressPhoto,
  type ProgressPhotoDeps,
} from "./actions";
import { makeProgressPhotosRepoFake } from "./progress-photos.repo.fake";

describe("Progress Photos Actions - Unit Tests", () => {
  // Test IDs (simple strings per TESTING.md)
  const user1Id = "user_1";
  const user2Id = "user_2";
  const photo1Id = "photo_1";
  const photo2Id = "photo_2";
  const photo3Id = "photo_3";

  describe("getProgressPhotos", () => {
    it("returns all photos for user sorted by date descending", async () => {
      const repo = makeProgressPhotosRepoFake();

      // Given: user has 3 photos
      repo._store.set(photo1Id, {
        id: photo1Id,
        userProfileId: user1Id,
        imageUrl: "https://example.com/photo1.jpg",
        weekNumber: 1,
        uploadedAt: new Date("2025-01-01"),
        feedback: "Baseline",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      repo._store.set(photo2Id, {
        id: photo2Id,
        userProfileId: user1Id,
        imageUrl: "https://example.com/photo2.jpg",
        weekNumber: 2,
        uploadedAt: new Date("2025-01-08"),
        feedback: null,
        createdAt: new Date("2025-01-08"),
        updatedAt: new Date("2025-01-08"),
      });

      repo._store.set(photo3Id, {
        id: photo3Id,
        userProfileId: user1Id,
        imageUrl: "https://example.com/photo3.jpg",
        weekNumber: 3,
        uploadedAt: new Date("2025-01-15"),
        feedback: "Good progress",
        createdAt: new Date("2025-01-15"),
        updatedAt: new Date("2025-01-15"),
      });

      const deps: ProgressPhotoDeps = {
        repo,
        now: () => new Date("2025-01-20"),
      };

      // When: get all photos
      const result = await getProgressPhotos(user1Id, deps);

      // Then: returns success with photos sorted newest first
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data[0].id).toBe(photo3Id); // Newest first
        expect(result.data[1].id).toBe(photo2Id);
        expect(result.data[2].id).toBe(photo1Id);
      }
    });

    it("returns empty array when user has no photos", async () => {
      const repo = makeProgressPhotosRepoFake();

      const deps: ProgressPhotoDeps = {
        repo,
        now: () => new Date("2025-01-20"),
      };

      // When: get photos for user with no photos
      const result = await getProgressPhotos(user1Id, deps);

      // Then: returns success with empty array
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it("returns only photos for specified user", async () => {
      const repo = makeProgressPhotosRepoFake();

      // Given: two users with photos
      repo._store.set(photo1Id, {
        id: photo1Id,
        userProfileId: user1Id,
        imageUrl: "https://example.com/photo1.jpg",
        weekNumber: 1,
        uploadedAt: new Date("2025-01-01"),
        feedback: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      repo._store.set(photo2Id, {
        id: photo2Id,
        userProfileId: user2Id,
        imageUrl: "https://example.com/photo2.jpg",
        weekNumber: 1,
        uploadedAt: new Date("2025-01-01"),
        feedback: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const deps: ProgressPhotoDeps = {
        repo,
        now: () => new Date("2025-01-20"),
      };

      // When: get photos for user1
      const result = await getProgressPhotos(user1Id, deps);

      // Then: returns only user1's photos
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].userProfileId).toBe(user1Id);
      }
    });

    it("returns error when userId is invalid", async () => {
      const deps: ProgressPhotoDeps = {
        repo: makeProgressPhotosRepoFake(),
        now: () => new Date("2025-01-20"),
      };

      // When: call with invalid userId
      const result = await getProgressPhotos("", deps);

      // Then: returns error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });

  describe("getProgressPhotosByWeek", () => {
    it("returns photos for specific week", async () => {
      const repo = makeProgressPhotosRepoFake();

      // Given: user has photos from different weeks
      repo._store.set(photo1Id, {
        id: photo1Id,
        userProfileId: user1Id,
        imageUrl: "https://example.com/photo1.jpg",
        weekNumber: 1,
        uploadedAt: new Date("2025-01-01"),
        feedback: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      repo._store.set(photo2Id, {
        id: photo2Id,
        userProfileId: user1Id,
        imageUrl: "https://example.com/photo2.jpg",
        weekNumber: 2,
        uploadedAt: new Date("2025-01-08"),
        feedback: null,
        createdAt: new Date("2025-01-08"),
        updatedAt: new Date("2025-01-08"),
      });

      const deps: ProgressPhotoDeps = {
        repo,
        now: () => new Date("2025-01-20"),
      };

      // When: get photos for week 1
      const result = await getProgressPhotosByWeek(user1Id, 1, deps);

      // Then: returns only week 1 photos
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].weekNumber).toBe(1);
      }
    });

    it("returns empty array when no photos for specified week", async () => {
      const repo = makeProgressPhotosRepoFake();

      const deps: ProgressPhotoDeps = {
        repo,
        now: () => new Date("2025-01-20"),
      };

      // When: get photos for week with no photos
      const result = await getProgressPhotosByWeek(user1Id, 5, deps);

      // Then: returns empty array
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it("returns error when weekNumber is invalid", async () => {
      const deps: ProgressPhotoDeps = {
        repo: makeProgressPhotosRepoFake(),
        now: () => new Date("2025-01-20"),
      };

      // When: call with invalid week number (0 or negative)
      const result = await getProgressPhotosByWeek(user1Id, 0, deps);

      // Then: returns error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });

  describe("createProgressPhoto", () => {
    it("creates photo with all required fields", async () => {
      const repo = makeProgressPhotosRepoFake();
      const fixedNow = new Date("2025-01-15T10:30:00Z");

      const deps: ProgressPhotoDeps = {
        repo,
        now: () => fixedNow,
      };

      const input = {
        imageUrl: "https://example.com/new-photo.jpg",
        weekNumber: 5,
        feedback: "Looking good!",
      };

      // When: create photo
      const result = await createProgressPhoto(user1Id, input, deps);

      // Then: returns success with created photo
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          userProfileId: user1Id,
          imageUrl: "https://example.com/new-photo.jpg",
          weekNumber: 5,
          feedback: "Looking good!",
          uploadedAt: fixedNow,
          createdAt: fixedNow,
          updatedAt: fixedNow,
        });
        expect(result.data.id).toBeDefined();
      }

      // And: photo is stored in repo
      expect(repo._store.size).toBe(1);
    });

    it("creates photo with null feedback", async () => {
      const repo = makeProgressPhotosRepoFake();
      const fixedNow = new Date("2025-01-15T10:30:00Z");

      const deps: ProgressPhotoDeps = {
        repo,
        now: () => fixedNow,
      };

      const input = {
        imageUrl: "https://example.com/new-photo.jpg",
        weekNumber: 1,
      };

      // When: create photo without feedback
      const result = await createProgressPhoto(user1Id, input, deps);

      // Then: creates photo with null feedback
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.feedback).toBeNull();
      }
    });

    it("trims feedback whitespace", async () => {
      const repo = makeProgressPhotosRepoFake();

      const deps: ProgressPhotoDeps = {
        repo,
        now: () => new Date("2025-01-15"),
      };

      const input = {
        imageUrl: "https://example.com/photo.jpg",
        weekNumber: 1,
        feedback: "  Some feedback  ",
      };

      // When: create photo with whitespace in feedback
      const result = await createProgressPhoto(user1Id, input, deps);

      // Then: feedback is trimmed
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.feedback).toBe("Some feedback");
      }
    });

    it("returns error when imageUrl is empty", async () => {
      const deps: ProgressPhotoDeps = {
        repo: makeProgressPhotosRepoFake(),
        now: () => new Date("2025-01-15"),
      };

      const input = {
        imageUrl: "",
        weekNumber: 1,
      };

      // When: create with empty imageUrl
      const result = await createProgressPhoto(user1Id, input, deps);

      // Then: returns error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when weekNumber is zero or negative", async () => {
      const deps: ProgressPhotoDeps = {
        repo: makeProgressPhotosRepoFake(),
        now: () => new Date("2025-01-15"),
      };

      const input = {
        imageUrl: "https://example.com/photo.jpg",
        weekNumber: 0,
      };

      // When: create with invalid weekNumber
      const result = await createProgressPhoto(user1Id, input, deps);

      // Then: returns error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when userId is invalid", async () => {
      const deps: ProgressPhotoDeps = {
        repo: makeProgressPhotosRepoFake(),
        now: () => new Date("2025-01-15"),
      };

      const input = {
        imageUrl: "https://example.com/photo.jpg",
        weekNumber: 1,
      };

      // When: create with empty userId
      const result = await createProgressPhoto("", input, deps);

      // Then: returns error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });

  describe("updatePhotoFeedback", () => {
    it("updates feedback successfully", async () => {
      const repo = makeProgressPhotosRepoFake();

      // Given: photo exists
      repo._store.set(photo1Id, {
        id: photo1Id,
        userProfileId: user1Id,
        imageUrl: "https://example.com/photo1.jpg",
        weekNumber: 1,
        uploadedAt: new Date("2025-01-01"),
        feedback: "Old feedback",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const fixedNow = new Date("2025-01-15T10:30:00Z");

      const deps: ProgressPhotoDeps = {
        repo,
        now: () => fixedNow,
      };

      // When: update feedback
      const result = await updatePhotoFeedback(photo1Id, "New feedback", deps);

      // Then: returns success
      expect(result.success).toBe(true);

      // And: feedback is updated in repo
      const updated = repo._store.get(photo1Id);
      expect(updated?.feedback).toBe("New feedback");
      expect(updated?.updatedAt).toEqual(fixedNow);
    });

    it("trims feedback whitespace", async () => {
      const repo = makeProgressPhotosRepoFake();

      // Given: photo exists
      repo._store.set(photo1Id, {
        id: photo1Id,
        userProfileId: user1Id,
        imageUrl: "https://example.com/photo1.jpg",
        weekNumber: 1,
        uploadedAt: new Date("2025-01-01"),
        feedback: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const deps: ProgressPhotoDeps = {
        repo,
        now: () => new Date("2025-01-15"),
      };

      // When: update with whitespace
      const result = await updatePhotoFeedback(photo1Id, "  Trimmed  ", deps);

      // Then: feedback is trimmed
      expect(result.success).toBe(true);
      expect(repo._store.get(photo1Id)?.feedback).toBe("Trimmed");
    });

    it("allows empty feedback (sets to null)", async () => {
      const repo = makeProgressPhotosRepoFake();

      // Given: photo exists with feedback
      repo._store.set(photo1Id, {
        id: photo1Id,
        userProfileId: user1Id,
        imageUrl: "https://example.com/photo1.jpg",
        weekNumber: 1,
        uploadedAt: new Date("2025-01-01"),
        feedback: "Some feedback",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const deps: ProgressPhotoDeps = {
        repo,
        now: () => new Date("2025-01-15"),
      };

      // When: update with empty string
      const result = await updatePhotoFeedback(photo1Id, "", deps);

      // Then: feedback is set to null
      expect(result.success).toBe(true);
      expect(repo._store.get(photo1Id)?.feedback).toBeNull();
    });

    it("returns error when photo not found", async () => {
      const deps: ProgressPhotoDeps = {
        repo: makeProgressPhotosRepoFake(),
        now: () => new Date("2025-01-15"),
      };

      // When: update non-existent photo
      const result = await updatePhotoFeedback("nonexistent_id", "Feedback", deps);

      // Then: returns error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Photo not found");
      }
    });

    it("returns error when photoId is invalid", async () => {
      const deps: ProgressPhotoDeps = {
        repo: makeProgressPhotosRepoFake(),
        now: () => new Date("2025-01-15"),
      };

      // When: update with empty photoId
      const result = await updatePhotoFeedback("", "Feedback", deps);

      // Then: returns error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });

  describe("deleteProgressPhoto", () => {
    it("deletes photo successfully", async () => {
      const repo = makeProgressPhotosRepoFake();

      // Given: photo exists
      repo._store.set(photo1Id, {
        id: photo1Id,
        userProfileId: user1Id,
        imageUrl: "https://example.com/photo1.jpg",
        weekNumber: 1,
        uploadedAt: new Date("2025-01-01"),
        feedback: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      });

      const deps: ProgressPhotoDeps = {
        repo,
        now: () => new Date("2025-01-15"),
      };

      // When: delete photo
      const result = await deleteProgressPhoto(photo1Id, deps);

      // Then: returns success
      expect(result.success).toBe(true);

      // And: photo is removed from repo
      expect(repo._store.has(photo1Id)).toBe(false);
    });

    it("returns error when photo not found", async () => {
      const deps: ProgressPhotoDeps = {
        repo: makeProgressPhotosRepoFake(),
        now: () => new Date("2025-01-15"),
      };

      // When: delete non-existent photo
      const result = await deleteProgressPhoto("nonexistent_id", deps);

      // Then: returns error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Photo not found");
      }
    });

    it("returns error when photoId is invalid", async () => {
      const deps: ProgressPhotoDeps = {
        repo: makeProgressPhotosRepoFake(),
        now: () => new Date("2025-01-15"),
      };

      // When: delete with empty photoId
      const result = await deleteProgressPhoto("", deps);

      // Then: returns error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });
});
