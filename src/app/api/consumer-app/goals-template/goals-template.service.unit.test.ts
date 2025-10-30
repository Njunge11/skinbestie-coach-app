import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeGoalsTemplateService } from "./goals-template.service";
import type { GoalsTemplateData } from "./goals-template.repo";

describe("GoalsTemplateService - Unit Tests", () => {
  let service: ReturnType<typeof makeGoalsTemplateService>;
  let mockRepo: {
    getGoalsTemplateByUserProfileId: ReturnType<typeof vi.fn>;
    getUserProfileIdByUserId: ReturnType<typeof vi.fn>;
    updateGoalsTemplate: ReturnType<typeof vi.fn>;
  };

  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const profileId = "650e8400-e29b-41d4-a716-446655440000";
  const templateId = "750e8400-e29b-41d4-a716-446655440000";

  const mockTemplate: GoalsTemplateData = {
    id: templateId,
    userId: profileId,
    status: "published",
    goalsAcknowledgedByClient: false,
    updatedAt: new Date("2025-01-15T10:00:00Z"),
  };

  beforeEach(() => {
    mockRepo = {
      getGoalsTemplateByUserProfileId: vi.fn(),
      getUserProfileIdByUserId: vi.fn(),
      updateGoalsTemplate: vi.fn(),
    };

    service = makeGoalsTemplateService({ repo: mockRepo });
  });

  describe("updateGoalsTemplate", () => {
    it("successfully updates goalsAcknowledgedByClient", async () => {
      mockRepo.getUserProfileIdByUserId.mockResolvedValue(profileId);
      mockRepo.getGoalsTemplateByUserProfileId.mockResolvedValue(mockTemplate);
      mockRepo.updateGoalsTemplate.mockResolvedValue({
        ...mockTemplate,
        goalsAcknowledgedByClient: true,
        updatedAt: new Date("2025-01-15T10:30:00Z"),
      });

      const result = await service.updateGoalsTemplate(userId, {
        goalsAcknowledgedByClient: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.goalsAcknowledgedByClient).toBe(true);
      }
      expect(mockRepo.updateGoalsTemplate).toHaveBeenCalledWith(profileId, {
        goalsAcknowledgedByClient: true,
      });
    });

    it("successfully updates status", async () => {
      mockRepo.getUserProfileIdByUserId.mockResolvedValue(profileId);
      mockRepo.getGoalsTemplateByUserProfileId.mockResolvedValue(mockTemplate);
      mockRepo.updateGoalsTemplate.mockResolvedValue({
        ...mockTemplate,
        status: "unpublished",
        updatedAt: new Date("2025-01-15T10:30:00Z"),
      });

      const result = await service.updateGoalsTemplate(userId, {
        status: "unpublished",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("unpublished");
      }
    });

    it("successfully updates multiple fields at once", async () => {
      mockRepo.getUserProfileIdByUserId.mockResolvedValue(profileId);
      mockRepo.getGoalsTemplateByUserProfileId.mockResolvedValue(mockTemplate);
      mockRepo.updateGoalsTemplate.mockResolvedValue({
        ...mockTemplate,
        goalsAcknowledgedByClient: true,
        status: "unpublished",
        updatedAt: new Date("2025-01-15T10:30:00Z"),
      });

      const result = await service.updateGoalsTemplate(userId, {
        goalsAcknowledgedByClient: true,
        status: "unpublished",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.goalsAcknowledgedByClient).toBe(true);
        expect(result.data.status).toBe("unpublished");
      }
      expect(mockRepo.updateGoalsTemplate).toHaveBeenCalledWith(profileId, {
        goalsAcknowledgedByClient: true,
        status: "unpublished",
      });
    });

    it("returns error when userId is empty string", async () => {
      const result = await service.updateGoalsTemplate("", {
        goalsAcknowledgedByClient: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User ID is required");
      }
      expect(mockRepo.getUserProfileIdByUserId).not.toHaveBeenCalled();
    });

    it("returns error when user not found", async () => {
      mockRepo.getUserProfileIdByUserId.mockResolvedValue(null);

      const result = await service.updateGoalsTemplate(userId, {
        goalsAcknowledgedByClient: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User not found");
      }
      expect(mockRepo.getGoalsTemplateByUserProfileId).not.toHaveBeenCalled();
    });

    it("returns error when goals template not found", async () => {
      mockRepo.getUserProfileIdByUserId.mockResolvedValue(profileId);
      mockRepo.getGoalsTemplateByUserProfileId.mockResolvedValue(null);

      const result = await service.updateGoalsTemplate(userId, {
        goalsAcknowledgedByClient: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Goals template not found");
      }
      expect(mockRepo.updateGoalsTemplate).not.toHaveBeenCalled();
    });

    it("handles repository errors", async () => {
      mockRepo.getUserProfileIdByUserId.mockResolvedValue(profileId);
      mockRepo.getGoalsTemplateByUserProfileId.mockResolvedValue(mockTemplate);
      mockRepo.updateGoalsTemplate.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await service.updateGoalsTemplate(userId, {
        goalsAcknowledgedByClient: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to update goals template");
      }
    });
  });
});
