import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeProfileService } from "./profile.service";
import type { ProfileData } from "./profile.repo";

describe("ProfileService - Unit Tests", () => {
  let service: ReturnType<typeof makeProfileService>;
  let mockRepo: {
    getProfileByUserId: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
  };

  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const profileId = "650e8400-e29b-41d4-a716-446655440000";

  const mockProfile: ProfileData = {
    id: profileId,
    userId,
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    nickname: null,
    phoneNumber: "+1234567890",
    productsReceived: false,
    routineStartDateSet: false,
    updatedAt: new Date("2025-01-15T10:00:00Z"),
  };

  beforeEach(() => {
    mockRepo = {
      getProfileByUserId: vi.fn(),
      updateProfile: vi.fn(),
    };

    service = makeProfileService({ repo: mockRepo });
  });

  describe("updateProfile", () => {
    it("successfully updates nickname", async () => {
      mockRepo.getProfileByUserId.mockResolvedValue(mockProfile);
      mockRepo.updateProfile.mockResolvedValue({
        ...mockProfile,
        nickname: "skinny",
        updatedAt: new Date("2025-01-15T10:30:00Z"),
      });

      const result = await service.updateProfile(userId, {
        nickname: "skinny",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nickname).toBe("skinny");
      }
      expect(mockRepo.updateProfile).toHaveBeenCalledWith(userId, {
        nickname: "skinny",
      });
    });

    it("successfully updates firstName", async () => {
      mockRepo.getProfileByUserId.mockResolvedValue(mockProfile);
      mockRepo.updateProfile.mockResolvedValue({
        ...mockProfile,
        firstName: "Jane",
        updatedAt: new Date("2025-01-15T10:30:00Z"),
      });

      const result = await service.updateProfile(userId, { firstName: "Jane" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe("Jane");
      }
    });

    it("successfully updates multiple fields at once", async () => {
      mockRepo.getProfileByUserId.mockResolvedValue(mockProfile);
      mockRepo.updateProfile.mockResolvedValue({
        ...mockProfile,
        nickname: "skinny",
        firstName: "Jane",
        updatedAt: new Date("2025-01-15T10:30:00Z"),
      });

      const result = await service.updateProfile(userId, {
        nickname: "skinny",
        firstName: "Jane",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nickname).toBe("skinny");
        expect(result.data.firstName).toBe("Jane");
      }
      expect(mockRepo.updateProfile).toHaveBeenCalledWith(userId, {
        nickname: "skinny",
        firstName: "Jane",
      });
    });

    it("returns error when userId is empty string", async () => {
      const result = await service.updateProfile("", { nickname: "skinny" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User ID is required");
      }
      expect(mockRepo.getProfileByUserId).not.toHaveBeenCalled();
    });

    it("returns error when user not found", async () => {
      mockRepo.getProfileByUserId.mockResolvedValue(null);

      const result = await service.updateProfile(userId, {
        nickname: "skinny",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User not found");
      }
      expect(mockRepo.updateProfile).not.toHaveBeenCalled();
    });

    it("handles repository errors", async () => {
      mockRepo.getProfileByUserId.mockResolvedValue(mockProfile);
      mockRepo.updateProfile.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await service.updateProfile(userId, {
        nickname: "skinny",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to update profile");
      }
    });
  });
});
