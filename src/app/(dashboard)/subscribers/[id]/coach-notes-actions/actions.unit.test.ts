import { describe, it, expect, beforeEach } from "vitest";
import { makeCoachNotesRepoFake } from "./coach-notes.repo.fake";
import {
  createCoachNote,
  updateCoachNote,
  deleteCoachNote,
  getCoachNotes,
  type CoachNoteDeps,
} from "./actions";

describe("Coach Notes Actions - Unit Tests", () => {
  let repo: ReturnType<typeof makeCoachNotesRepoFake>;
  let deps: CoachNoteDeps;
  let mockNow: Date;

  // Test UUIDs
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const admin1Id = "550e8400-e29b-41d4-a716-446655440001";
  const admin2Id = "550e8400-e29b-41d4-a716-446655440002";
  const user2Id = "550e8400-e29b-41d4-a716-446655440003";

  beforeEach(() => {
    repo = makeCoachNotesRepoFake();
    mockNow = new Date("2025-01-15T10:00:00Z");
    deps = {
      repo,
      now: () => mockNow,
    };
  });

  describe("createCoachNote", () => {
    it("successfully creates a note with valid data", async () => {
      const result = await createCoachNote(userId, admin1Id, "Client is progressing well", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("550e8400-e29b-41d4-a716-000000000001"); // First generated UUID
        expect(result.data.userProfileId).toBe(userId);
        expect(result.data.adminId).toBe(admin1Id);
        expect(result.data.content).toBe("Client is progressing well");
        expect(result.data.createdAt).toEqual(mockNow);
        expect(result.data.updatedAt).toEqual(mockNow);
      }
    });

    it("returns error when userProfileId is invalid", async () => {
      const result = await createCoachNote("invalid", admin1Id, "Note content", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when adminId is invalid", async () => {
      const result = await createCoachNote(userId, "invalid", "Note content", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when content is empty", async () => {
      const result = await createCoachNote(userId, admin1Id, "", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when content is whitespace only", async () => {
      const result = await createCoachNote(userId, admin1Id, "   ", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("sets createdAt and updatedAt timestamps correctly", async () => {
      const specificTime = new Date("2025-03-20T14:30:00Z");
      const customDeps = { ...deps, now: () => specificTime };

      const result = await createCoachNote(userId, admin1Id, "Test note", customDeps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.createdAt).toEqual(specificTime);
        expect(result.data.updatedAt).toEqual(specificTime);
      }
    });

    it("returns the created note with all fields", async () => {
      const result = await createCoachNote(userId, admin1Id, "Complete note", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty("id");
        expect(result.data).toHaveProperty("userProfileId");
        expect(result.data).toHaveProperty("adminId");
        expect(result.data).toHaveProperty("content");
        expect(result.data).toHaveProperty("createdAt");
        expect(result.data).toHaveProperty("updatedAt");
      }
    });
  });

  describe("updateCoachNote", () => {
    it("successfully updates note content", async () => {
      // Create a note first
      const createResult = await createCoachNote(userId, admin1Id, "Original content", deps);
      if (!createResult.success) throw new Error("Setup failed");
      const noteId = createResult.data.id;

      // Update it
      const laterTime = new Date("2025-01-15T11:00:00Z");
      const updateDeps = { ...deps, now: () => laterTime };
      const result = await updateCoachNote(noteId, "Updated content", updateDeps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe("Updated content");
        expect(result.data.updatedAt).toEqual(laterTime);
        expect(result.data.createdAt).toEqual(mockNow); // createdAt should not change
      }
    });

    it("returns error when noteId is invalid", async () => {
      const result = await updateCoachNote("invalid", "New content", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when note does not exist", async () => {
      const nonExistentId = "550e8400-e29b-41d4-a716-999999999999";
      const result = await updateCoachNote(nonExistentId, "New content", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Note not found");
      }
    });

    it("returns error when content update is empty", async () => {
      const createResult = await createCoachNote(userId, admin1Id, "Original", deps);
      if (!createResult.success) throw new Error("Setup failed");
      const noteId = createResult.data.id;

      const result = await updateCoachNote(noteId, "", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when content update is whitespace only", async () => {
      const createResult = await createCoachNote(userId, admin1Id, "Original", deps);
      if (!createResult.success) throw new Error("Setup failed");
      const noteId = createResult.data.id;

      const result = await updateCoachNote(noteId, "   ", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("updates the updatedAt timestamp", async () => {
      const createResult = await createCoachNote(userId, admin1Id, "Original", deps);
      if (!createResult.success) throw new Error("Setup failed");
      const noteId = createResult.data.id;

      const laterTime = new Date("2025-01-15T12:00:00Z");
      const updateDeps = { ...deps, now: () => laterTime };
      const result = await updateCoachNote(noteId, "Updated", updateDeps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.updatedAt).toEqual(laterTime);
        expect(result.data.updatedAt).not.toEqual(result.data.createdAt);
      }
    });

    it("returns the updated note with new content", async () => {
      const createResult = await createCoachNote(userId, admin1Id, "Original", deps);
      if (!createResult.success) throw new Error("Setup failed");
      const noteId = createResult.data.id;

      const result = await updateCoachNote(noteId, "New content here", deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(noteId);
        expect(result.data.content).toBe("New content here");
        expect(result.data.userProfileId).toBe(userId);
        expect(result.data.adminId).toBe(admin1Id);
      }
    });
  });

  describe("deleteCoachNote", () => {
    it("successfully deletes a note", async () => {
      const createResult = await createCoachNote(userId, admin1Id, "Note to delete", deps);
      if (!createResult.success) throw new Error("Setup failed");
      const noteId = createResult.data.id;

      const result = await deleteCoachNote(noteId, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(noteId);
      }

      // Verify it's deleted
      const checkResult = await repo.findById(noteId);
      expect(checkResult).toBeNull();
    });

    it("returns error when noteId is invalid", async () => {
      const result = await deleteCoachNote("invalid", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });

    it("returns error when note does not exist", async () => {
      const nonExistentId = "550e8400-e29b-41d4-a716-999999999999";
      const result = await deleteCoachNote(nonExistentId, deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Note not found");
      }
    });
  });

  describe("getCoachNotes", () => {
    it("successfully retrieves all notes for a user profile", async () => {
      const time1 = new Date("2025-01-15T10:00:00Z");
      const time2 = new Date("2025-01-15T11:00:00Z");

      await createCoachNote(userId, admin1Id, "First note", { ...deps, now: () => time1 });
      await createCoachNote(userId, admin2Id, "Second note", { ...deps, now: () => time2 });
      await createCoachNote(user2Id, admin1Id, "Different user", deps);

      const result = await getCoachNotes(userId, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].content).toBe("Second note"); // Newest first
        expect(result.data[1].content).toBe("First note");
      }
    });

    it("returns notes ordered by createdAt descending", async () => {
      const time1 = new Date("2025-01-15T10:00:00Z");
      const time2 = new Date("2025-01-15T11:00:00Z");
      const time3 = new Date("2025-01-15T12:00:00Z");

      await createCoachNote(userId, admin1Id, "First", { ...deps, now: () => time1 });
      await createCoachNote(userId, admin1Id, "Second", { ...deps, now: () => time2 });
      await createCoachNote(userId, admin1Id, "Third", { ...deps, now: () => time3 });

      const result = await getCoachNotes(userId, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data[0].content).toBe("Third"); // Most recent
        expect(result.data[1].content).toBe("Second");
        expect(result.data[2].content).toBe("First"); // Oldest
      }
    });

    it("returns empty array when no notes exist for user", async () => {
      await createCoachNote(userId, admin1Id, "Some note", deps);

      const result = await getCoachNotes(user2Id, deps);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it("returns error when userProfileId is invalid", async () => {
      const result = await getCoachNotes("invalid", deps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid data");
      }
    });
  });

  describe("Error Handling", () => {
    it("createCoachNote handles repository errors", async () => {
      const errorRepo = makeCoachNotesRepoFake();
      errorRepo.create = async () => {
        throw new Error("Database connection failed");
      };

      const errorDeps: CoachNoteDeps = {
        repo: errorRepo,
        now: () => mockNow,
      };

      const result = await createCoachNote(userId, admin1Id, "Test note", errorDeps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to create note");
      }
    });

    it("updateCoachNote handles repository errors", async () => {
      const errorRepo = makeCoachNotesRepoFake();
      errorRepo.findById = async () => ({
        id: userId,
        userProfileId: userId,
        adminId: admin1Id,
        content: "Original content",
        createdAt: mockNow,
        updatedAt: mockNow,
      });
      errorRepo.update = async () => {
        throw new Error("Database connection failed");
      };

      const errorDeps: CoachNoteDeps = {
        repo: errorRepo,
        now: () => mockNow,
      };

      const result = await updateCoachNote(userId, "Updated content", errorDeps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to update note");
      }
    });

    it("deleteCoachNote handles repository errors", async () => {
      const errorRepo = makeCoachNotesRepoFake();
      errorRepo.deleteById = async () => {
        throw new Error("Database connection failed");
      };

      const errorDeps: CoachNoteDeps = {
        repo: errorRepo,
        now: () => mockNow,
      };

      const result = await deleteCoachNote(userId, errorDeps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to delete note");
      }
    });

    it("getCoachNotes handles repository errors", async () => {
      const errorRepo = makeCoachNotesRepoFake();
      errorRepo.findByUserProfileId = async () => {
        throw new Error("Database connection failed");
      };

      const errorDeps: CoachNoteDeps = {
        repo: errorRepo,
        now: () => mockNow,
      };

      const result = await getCoachNotes(userId, errorDeps);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to fetch notes");
      }
    });
  });
});
