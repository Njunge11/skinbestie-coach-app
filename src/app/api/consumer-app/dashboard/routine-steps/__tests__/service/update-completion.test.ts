// Service layer tests for updating routine step completions
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeCompletionService } from "../../completion.service";
import type { CompletionRepo } from "../../completion.repo";

describe("CompletionService - updateCompletion", () => {
  let mockRepo: {
    getUserProfileId: ReturnType<typeof vi.fn>;
    updateCompletion: ReturnType<typeof vi.fn>;
    updateCompletionsByDate: ReturnType<typeof vi.fn>;
  };
  let service: ReturnType<typeof makeCompletionService>;

  beforeEach(() => {
    // Create mock repo with all methods
    mockRepo = {
      getUserProfileId: vi.fn(),
      updateCompletion: vi.fn(),
      updateCompletionsByDate: vi.fn(),
    };

    // Default: getUserProfileId returns a valid profile
    mockRepo.getUserProfileId.mockResolvedValue({
      id: "profile-1",
    });

    service = makeCompletionService({
      repo: mockRepo as unknown as CompletionRepo,
    });
  });

  describe("Single Step Operations", () => {
    it("successfully marks single step as complete", async () => {
      const mockCompletion = {
        id: "completion-1",
        routineProductId: "product-1",
        userProfileId: "profile-1",
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "morning" as const,
        onTimeDeadline: new Date("2025-11-07T14:00:00Z"),
        gracePeriodEnd: new Date("2025-11-07T20:00:00Z"),
        completedAt: new Date("2025-11-07T08:00:00Z"),
        status: "on-time" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepo.updateCompletion).mockResolvedValue(mockCompletion);

      const result = await service.updateCompletion({
        stepId: "completion-1",
        completed: true,
        userId: "auth-user-1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockCompletion);
      }
      expect(mockRepo.getUserProfileId).toHaveBeenCalledWith("auth-user-1");
      expect(mockRepo.updateCompletion).toHaveBeenCalledWith({
        stepId: "completion-1",
        completed: true,
        userProfileId: "profile-1",
        completedAt: expect.any(Date),
      });
    });

    it("returns error when user profile not found", async () => {
      mockRepo.getUserProfileId.mockResolvedValue(null);

      const result = await service.updateCompletion({
        stepId: "completion-1",
        completed: true,
        userId: "non-existent-user",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User not found");
      }
      expect(mockRepo.updateCompletion).not.toHaveBeenCalled();
    });

    it("successfully marks single step as incomplete", async () => {
      const mockCompletion = {
        id: "completion-1",
        routineProductId: "product-1",
        userProfileId: "profile-1",
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "morning" as const,
        onTimeDeadline: new Date("2025-11-07T14:00:00Z"),
        gracePeriodEnd: new Date("2025-11-07T20:00:00Z"),
        completedAt: null,
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepo.updateCompletion).mockResolvedValue(mockCompletion);

      const result = await service.updateCompletion({
        stepId: "completion-1",
        completed: false,
        userId: "auth-user-1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockCompletion);
      }
      expect(mockRepo.updateCompletion).toHaveBeenCalledWith({
        stepId: "completion-1",
        completed: false,
        userProfileId: "profile-1",
      });
    });

    it("returns error when step not found", async () => {
      vi.mocked(mockRepo.updateCompletion).mockResolvedValue(null);

      const result = await service.updateCompletion({
        stepId: "non-existent",
        completed: true,
        userId: "auth-user-1",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Step not found or not authorized");
      }
    });

    it("returns error when repo throws exception", async () => {
      vi.mocked(mockRepo.updateCompletion).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await service.updateCompletion({
        stepId: "completion-1",
        completed: true,
        userId: "auth-user-1",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to update completion");
      }
    });

    it("passes server timestamp when marking complete", async () => {
      const beforeCall = new Date();

      vi.mocked(mockRepo.updateCompletion).mockResolvedValue({
        id: "completion-1",
        routineProductId: "product-1",
        userProfileId: "profile-1",
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "morning" as const,
        onTimeDeadline: new Date("2025-11-07T14:00:00Z"),
        gracePeriodEnd: new Date("2025-11-07T20:00:00Z"),
        completedAt: new Date(),
        status: "on-time" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.updateCompletion({
        stepId: "completion-1",
        completed: true,
        userId: "auth-user-1",
      });

      const afterCall = new Date();

      expect(mockRepo.updateCompletion).toHaveBeenCalledWith({
        stepId: "completion-1",
        completed: true,
        userProfileId: "profile-1",
        completedAt: expect.any(Date),
      });

      // Verify timestamp is between before and after
      const call = vi.mocked(mockRepo.updateCompletion).mock.calls[0][0];
      if (call.completedAt) {
        expect(call.completedAt.getTime()).toBeGreaterThanOrEqual(
          beforeCall.getTime(),
        );
        expect(call.completedAt.getTime()).toBeLessThanOrEqual(
          afterCall.getTime(),
        );
      }
    });

    it("does not pass timestamp when marking incomplete", async () => {
      vi.mocked(mockRepo.updateCompletion).mockResolvedValue({
        id: "completion-1",
        routineProductId: "product-1",
        userProfileId: "profile-1",
        scheduledDate: new Date("2025-11-07"),
        scheduledTimeOfDay: "morning" as const,
        onTimeDeadline: new Date("2025-11-07T14:00:00Z"),
        gracePeriodEnd: new Date("2025-11-07T20:00:00Z"),
        completedAt: null,
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.updateCompletion({
        stepId: "completion-1",
        completed: false,
        userId: "auth-user-1",
      });

      expect(mockRepo.updateCompletion).toHaveBeenCalledWith({
        stepId: "completion-1",
        completed: false,
        userProfileId: "profile-1",
      });

      // Verify no completedAt was passed
      const call = vi.mocked(mockRepo.updateCompletion).mock.calls[0][0];
      expect(call.completedAt).toBeUndefined();
    });
  });

  describe("Multi-Step Operations", () => {
    it("successfully marks all steps for date as complete", async () => {
      const mockCompletions = [
        {
          id: "completion-1",
          routineProductId: "product-1",
          userProfileId: "profile-1",
          scheduledDate: new Date("2025-11-07"),
          scheduledTimeOfDay: "morning" as const,
          onTimeDeadline: new Date("2025-11-07T14:00:00Z"),
          gracePeriodEnd: new Date("2025-11-07T20:00:00Z"),
          completedAt: new Date("2025-11-07T08:00:00Z"),
          status: "on-time" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "completion-2",
          routineProductId: "product-2",
          userProfileId: "profile-1",
          scheduledDate: new Date("2025-11-07"),
          scheduledTimeOfDay: "morning" as const,
          onTimeDeadline: new Date("2025-11-07T14:00:00Z"),
          gracePeriodEnd: new Date("2025-11-07T20:00:00Z"),
          completedAt: new Date("2025-11-07T08:00:00Z"),
          status: "on-time" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(mockRepo.updateCompletionsByDate).mockResolvedValue(
        mockCompletions,
      );

      const result = await service.updateCompletion({
        date: "2025-11-07",
        completed: true,
        userId: "auth-user-1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockCompletions);
      }
      expect(mockRepo.updateCompletionsByDate).toHaveBeenCalledWith({
        date: "2025-11-07",
        completed: true,
        userProfileId: "profile-1",
        completedAt: expect.any(Date),
      });
    });

    it("successfully marks all steps for date as incomplete", async () => {
      const mockCompletions = [
        {
          id: "completion-1",
          routineProductId: "product-1",
          userProfileId: "profile-1",
          scheduledDate: new Date("2025-11-07"),
          scheduledTimeOfDay: "morning" as const,
          onTimeDeadline: new Date("2025-11-07T14:00:00Z"),
          gracePeriodEnd: new Date("2025-11-07T20:00:00Z"),
          completedAt: null,
          status: "pending" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(mockRepo.updateCompletionsByDate).mockResolvedValue(
        mockCompletions,
      );

      const result = await service.updateCompletion({
        date: "2025-11-07",
        completed: false,
        userId: "auth-user-1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockCompletions);
      }
      expect(mockRepo.updateCompletionsByDate).toHaveBeenCalledWith({
        date: "2025-11-07",
        completed: false,
        userProfileId: "profile-1",
      });
    });

    it("returns empty array when no steps found for date", async () => {
      vi.mocked(mockRepo.updateCompletionsByDate).mockResolvedValue([]);

      const result = await service.updateCompletion({
        date: "2025-11-07",
        completed: true,
        userId: "auth-user-1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it("returns error when repo throws exception", async () => {
      vi.mocked(mockRepo.updateCompletionsByDate).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await service.updateCompletion({
        date: "2025-11-07",
        completed: true,
        userId: "auth-user-1",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to update completions");
      }
    });

    it("passes server timestamp when marking date complete", async () => {
      const beforeCall = new Date();

      vi.mocked(mockRepo.updateCompletionsByDate).mockResolvedValue([
        {
          id: "completion-1",
          routineProductId: "product-1",
          userProfileId: "profile-1",
          scheduledDate: new Date("2025-11-07"),
          scheduledTimeOfDay: "morning" as const,
          onTimeDeadline: new Date("2025-11-07T14:00:00Z"),
          gracePeriodEnd: new Date("2025-11-07T20:00:00Z"),
          completedAt: new Date(),
          status: "on-time" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await service.updateCompletion({
        date: "2025-11-07",
        completed: true,
        userId: "auth-user-1",
      });

      const afterCall = new Date();

      expect(mockRepo.updateCompletionsByDate).toHaveBeenCalledWith({
        date: "2025-11-07",
        completed: true,
        userProfileId: "profile-1",
        completedAt: expect.any(Date),
      });

      // Verify timestamp is between before and after
      const call = vi.mocked(mockRepo.updateCompletionsByDate).mock.calls[0][0];
      if (call.completedAt) {
        expect(call.completedAt.getTime()).toBeGreaterThanOrEqual(
          beforeCall.getTime(),
        );
        expect(call.completedAt.getTime()).toBeLessThanOrEqual(
          afterCall.getTime(),
        );
      }
    });

    it("does not pass timestamp when marking date incomplete", async () => {
      vi.mocked(mockRepo.updateCompletionsByDate).mockResolvedValue([
        {
          id: "completion-1",
          routineProductId: "product-1",
          userProfileId: "profile-1",
          scheduledDate: new Date("2025-11-07"),
          scheduledTimeOfDay: "morning" as const,
          onTimeDeadline: new Date("2025-11-07T14:00:00Z"),
          gracePeriodEnd: new Date("2025-11-07T20:00:00Z"),
          completedAt: null,
          status: "pending" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await service.updateCompletion({
        date: "2025-11-07",
        completed: false,
        userId: "auth-user-1",
      });

      expect(mockRepo.updateCompletionsByDate).toHaveBeenCalledWith({
        date: "2025-11-07",
        completed: false,
        userProfileId: "profile-1",
      });

      // Verify no completedAt was passed
      const call = vi.mocked(mockRepo.updateCompletionsByDate).mock.calls[0][0];
      expect(call.completedAt).toBeUndefined();
    });
  });
});
