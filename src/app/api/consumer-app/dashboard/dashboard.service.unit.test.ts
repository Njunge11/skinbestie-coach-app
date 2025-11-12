// Unit tests for user profile service using TDD approach
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  makeDashboardService,
  type DashboardServiceDeps,
} from "./dashboard.service";
import type { DashboardUserData, Goal, RoutineStep } from "./dashboard.repo";

describe("DashboardService", () => {
  let service: ReturnType<typeof makeDashboardService>;
  let mockRepo: {
    getUserDashboardData: ReturnType<typeof vi.fn>;
    getPublishedGoals: ReturnType<typeof vi.fn>;
    getTodayRoutineSteps: ReturnType<typeof vi.fn>;
    getCatchupSteps: ReturnType<typeof vi.fn>;
    getRoutine: ReturnType<typeof vi.fn>;
    getProfileTags: ReturnType<typeof vi.fn>;
  };
  let deps: DashboardServiceDeps;

  // Test data
  const authUserId = "350e8400-e29b-41d4-a716-446655440099"; // Auth user ID
  const profileId = "550e8400-e29b-41d4-a716-446655440000"; // Profile ID
  const today = new Date("2025-01-28");

  const baseDashboardData: DashboardUserData = {
    userId: authUserId, // Auth user ID
    userProfileId: profileId, // Profile ID
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phoneNumber: "+1234567890",
    dateOfBirth: new Date("1990-01-01"),
    nickname: null,
    skinType: null,
    concerns: null,
    hasAllergies: null,
    allergyDetails: null,
    isSubscribed: null,
    occupation: null,
    bio: null,
    timezone: "Europe/London",
    hasCompletedSkinTest: false,
    hasCompletedBooking: false,
    goalsTemplateId: null,
    goalsTemplateStatus: null,
    goalsAcknowledgedByClient: null,
    routineId: null,
    routineStatus: null,
  };

  const sampleGoals: Goal[] = [
    {
      id: "goal-1",
      description: "Clear skin",
      timeline: null,
      complete: false,
      completedAt: null,
      order: 1,
      isPrimaryGoal: true,
    },
    {
      id: "goal-2",
      description: "Even skin tone",
      timeline: null,
      complete: true,
      completedAt: new Date("2025-01-15"),
      order: 2,
      isPrimaryGoal: false,
    },
  ];

  const sampleRoutineSteps: RoutineStep[] = [
    {
      id: "step-1",
      routineStep: "Cleanse",
      productName: "Gentle Cleanser",
      productUrl: null,
      instructions: "Apply to wet face",
      timeOfDay: "morning",
      order: 1,
      status: "pending",
      completedAt: null,
    },
  ];

  beforeEach(() => {
    mockRepo = {
      getUserDashboardData: vi.fn(),
      getPublishedGoals: vi.fn(),
      getTodayRoutineSteps: vi.fn(),
      getCatchupSteps: vi.fn().mockResolvedValue([]), // Default to empty catchup steps
      getRoutine: vi.fn().mockResolvedValue(null), // Default to null routine
      getProfileTags: vi.fn().mockResolvedValue([]), // Default to empty tags
    };

    deps = {
      repo: mockRepo,
      now: () => today,
    };

    service = makeDashboardService(deps);
  });

  describe("getConsumerDashboard", () => {
    it("returns complete profile when all data exists (100%, 4/4)", async () => {
      // Given
      mockRepo.getUserDashboardData.mockResolvedValue({
        ...baseDashboardData,
        hasCompletedSkinTest: true,
        hasCompletedBooking: true,
        goalsTemplateId: "template-1",
        goalsTemplateStatus: "published",
        routineId: "routine-1",
        routineStatus: "published",
      });
      mockRepo.getPublishedGoals.mockResolvedValue(sampleGoals);
      mockRepo.getTodayRoutineSteps.mockResolvedValue(sampleRoutineSteps);

      // When
      const result = await service.getConsumerDashboard(authUserId);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user).toEqual({
          userId: authUserId,
          userProfileId: profileId,
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phoneNumber: "+1234567890",
          dateOfBirth: new Date("1990-01-01"),
          nickname: null,
          skinType: null,
          concerns: null,
          hasAllergies: null,
          allergyDetails: null,
          isSubscribed: null,
          occupation: null,
          bio: null,
          timezone: "Europe/London",
          profileTags: [],
        });
        expect(result.data.setupProgress).toEqual({
          percentage: 100,
          completed: 4,
          total: 4,
          steps: {
            hasCompletedSkinTest: true,
            hasCompletedBooking: true,
            hasPublishedGoals: true,
            hasPublishedRoutine: true,
          },
        });
        expect(result.data.goals).toEqual(sampleGoals);
        expect(result.data.todayRoutine).toEqual(sampleRoutineSteps);
      }
    });

    it("returns profile with 0% progress (0/4)", async () => {
      // Given
      mockRepo.getUserDashboardData.mockResolvedValue(baseDashboardData);
      mockRepo.getPublishedGoals.mockResolvedValue([]);
      mockRepo.getTodayRoutineSteps.mockResolvedValue([]);

      // When
      const result = await service.getConsumerDashboard(authUserId);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.setupProgress).toEqual({
          percentage: 0,
          completed: 0,
          total: 4,
          steps: {
            hasCompletedSkinTest: false,
            hasCompletedBooking: false,
            hasPublishedGoals: false,
            hasPublishedRoutine: false,
          },
        });
      }
    });

    it("returns profile with 25% progress (1/4)", async () => {
      // Given
      mockRepo.getUserDashboardData.mockResolvedValue({
        ...baseDashboardData,
        hasCompletedSkinTest: true,
      });
      mockRepo.getPublishedGoals.mockResolvedValue([]);
      mockRepo.getTodayRoutineSteps.mockResolvedValue([]);

      // When
      const result = await service.getConsumerDashboard(authUserId);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.setupProgress).toEqual({
          percentage: 25,
          completed: 1,
          total: 4,
          steps: {
            hasCompletedSkinTest: true,
            hasCompletedBooking: false,
            hasPublishedGoals: false,
            hasPublishedRoutine: false,
          },
        });
      }
    });

    it("returns profile with 50% progress (2/4)", async () => {
      // Given
      mockRepo.getUserDashboardData.mockResolvedValue({
        ...baseDashboardData,
        hasCompletedSkinTest: true,
        hasCompletedBooking: true,
      });
      mockRepo.getPublishedGoals.mockResolvedValue([]);
      mockRepo.getTodayRoutineSteps.mockResolvedValue([]);

      // When
      const result = await service.getConsumerDashboard(authUserId);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.setupProgress).toEqual({
          percentage: 50,
          completed: 2,
          total: 4,
          steps: {
            hasCompletedSkinTest: true,
            hasCompletedBooking: true,
            hasPublishedGoals: false,
            hasPublishedRoutine: false,
          },
        });
      }
    });

    it("returns profile with 75% progress (3/4)", async () => {
      // Given
      mockRepo.getUserDashboardData.mockResolvedValue({
        ...baseDashboardData,
        hasCompletedSkinTest: true,
        hasCompletedBooking: true,
        goalsTemplateId: "template-1",
        goalsTemplateStatus: "published",
      });
      mockRepo.getPublishedGoals.mockResolvedValue(sampleGoals);
      mockRepo.getTodayRoutineSteps.mockResolvedValue([]);

      // When
      const result = await service.getConsumerDashboard(authUserId);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.setupProgress).toEqual({
          percentage: 75,
          completed: 3,
          total: 4,
          steps: {
            hasCompletedSkinTest: true,
            hasCompletedBooking: true,
            hasPublishedGoals: true,
            hasPublishedRoutine: false,
          },
        });
      }
    });

    it("returns null goals when template is unpublished", async () => {
      // Given
      mockRepo.getUserDashboardData.mockResolvedValue({
        ...baseDashboardData,
        goalsTemplateId: "template-1",
        goalsTemplateStatus: "unpublished",
      });
      mockRepo.getPublishedGoals.mockResolvedValue([]);
      mockRepo.getTodayRoutineSteps.mockResolvedValue([]);

      // When
      const result = await service.getConsumerDashboard(authUserId);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.goals).toBeNull();
        expect(result.data.setupProgress.steps.hasPublishedGoals).toBe(false);
      }
    });

    it("returns null goals when no template exists", async () => {
      // Given
      mockRepo.getUserDashboardData.mockResolvedValue(baseDashboardData);
      mockRepo.getPublishedGoals.mockResolvedValue([]);
      mockRepo.getTodayRoutineSteps.mockResolvedValue([]);

      // When
      const result = await service.getConsumerDashboard(authUserId);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.goals).toBeNull();
        expect(result.data.setupProgress.steps.hasPublishedGoals).toBe(false);
      }
    });

    it("returns null routine when routine is draft", async () => {
      // Given
      mockRepo.getUserDashboardData.mockResolvedValue({
        ...baseDashboardData,
        routineId: "routine-1",
        routineStatus: "draft",
      });
      mockRepo.getPublishedGoals.mockResolvedValue([]);
      mockRepo.getTodayRoutineSteps.mockResolvedValue([]);

      // When
      const result = await service.getConsumerDashboard(authUserId);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.todayRoutine).toBeNull();
        expect(result.data.setupProgress.steps.hasPublishedRoutine).toBe(false);
      }
    });

    it("returns null routine when no routine exists", async () => {
      // Given
      mockRepo.getUserDashboardData.mockResolvedValue(baseDashboardData);
      mockRepo.getPublishedGoals.mockResolvedValue([]);
      mockRepo.getTodayRoutineSteps.mockResolvedValue([]);

      // When
      const result = await service.getConsumerDashboard(authUserId);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.todayRoutine).toBeNull();
        expect(result.data.setupProgress.steps.hasPublishedRoutine).toBe(false);
      }
    });

    it("returns empty routine array when no steps scheduled for today", async () => {
      // Given
      mockRepo.getUserDashboardData.mockResolvedValue({
        ...baseDashboardData,
        routineId: "routine-1",
        routineStatus: "published",
      });
      mockRepo.getPublishedGoals.mockResolvedValue([]);
      mockRepo.getTodayRoutineSteps.mockResolvedValue([]);

      // When
      const result = await service.getConsumerDashboard(authUserId);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.todayRoutine).toEqual([]);
        expect(result.data.setupProgress.steps.hasPublishedRoutine).toBe(true);
      }
    });

    it("returns error when user not found", async () => {
      // Given
      mockRepo.getUserDashboardData.mockResolvedValue(null);

      // When
      const result = await service.getConsumerDashboard(authUserId);

      // Then
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("User not found");
      }
    });

    it("handles repository errors gracefully", async () => {
      // Given
      mockRepo.getUserDashboardData.mockRejectedValue(
        new Error("Database connection failed"),
      );

      // When
      const result = await service.getConsumerDashboard(authUserId);

      // Then
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to retrieve dashboard data");
      }
    });

    it("transforms repository data to API response format correctly", async () => {
      // Given
      const fullProfile: DashboardUserData = {
        userId: authUserId,
        userProfileId: profileId,
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        phoneNumber: "+1234567890",
        dateOfBirth: new Date("1990-01-01"),
        nickname: null,
        skinType: null,
        concerns: null,
        hasAllergies: null,
        allergyDetails: null,
        isSubscribed: null,
        occupation: null,
        bio: null,
        timezone: "Europe/London",
        hasCompletedSkinTest: true,
        hasCompletedBooking: false,
        goalsTemplateId: "template-1",
        goalsTemplateStatus: "published",
        goalsAcknowledgedByClient: false,
        routineId: "routine-1",
        routineStatus: "published",
      };
      mockRepo.getUserDashboardData.mockResolvedValue(fullProfile);
      mockRepo.getPublishedGoals.mockResolvedValue(sampleGoals);
      mockRepo.getTodayRoutineSteps.mockResolvedValue(sampleRoutineSteps);

      // When
      const result = await service.getConsumerDashboard(authUserId);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user.firstName).toBe("Jane");
        expect(result.data.user.lastName).toBe("Smith");
        expect(result.data.user.email).toBe("jane@example.com");
      }
    });

    it("handles null/undefined values without errors", async () => {
      // Given
      mockRepo.getUserDashboardData.mockResolvedValue({
        ...baseDashboardData,
        hasCompletedSkinTest: null,
        hasCompletedBooking: null,
      });
      mockRepo.getPublishedGoals.mockResolvedValue([]);
      mockRepo.getTodayRoutineSteps.mockResolvedValue([]);

      // When
      const result = await service.getConsumerDashboard(authUserId);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.setupProgress.steps.hasCompletedSkinTest).toBe(
          false,
        );
        expect(result.data.setupProgress.steps.hasCompletedBooking).toBe(false);
      }
    });

    it("calls all repository methods in parallel", async () => {
      // Given
      mockRepo.getUserDashboardData.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(baseDashboardData), 100),
          ),
      );
      mockRepo.getPublishedGoals.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100)),
      );
      mockRepo.getTodayRoutineSteps.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100)),
      );

      // When
      const start = Date.now();
      await service.getConsumerDashboard(authUserId);
      const duration = Date.now() - start;

      // Then - should take ~100ms (parallel) not ~300ms (sequential)
      expect(duration).toBeLessThan(250);
      expect(mockRepo.getUserDashboardData).toHaveBeenCalledWith(authUserId);
      expect(mockRepo.getPublishedGoals).toHaveBeenCalledWith(authUserId);
      expect(mockRepo.getTodayRoutineSteps).toHaveBeenCalledWith(
        authUserId,
        today,
      );
    });

    it("correctly determines hasPublishedGoals from template status", async () => {
      // Test published
      mockRepo.getUserDashboardData.mockResolvedValue({
        ...baseDashboardData,
        goalsTemplateId: "template-1",
        goalsTemplateStatus: "published",
      });
      mockRepo.getPublishedGoals.mockResolvedValue(sampleGoals);
      mockRepo.getTodayRoutineSteps.mockResolvedValue([]);

      let result = await service.getConsumerDashboard(authUserId);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.setupProgress.steps.hasPublishedGoals).toBe(true);
      }

      // Test unpublished
      mockRepo.getUserDashboardData.mockResolvedValue({
        ...baseDashboardData,
        goalsTemplateId: "template-1",
        goalsTemplateStatus: "unpublished",
      });

      result = await service.getConsumerDashboard(authUserId);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.setupProgress.steps.hasPublishedGoals).toBe(false);
      }
    });

    it("correctly determines hasPublishedRoutine from routine status", async () => {
      // Test published
      mockRepo.getUserDashboardData.mockResolvedValue({
        ...baseDashboardData,
        routineId: "routine-1",
        routineStatus: "published",
      });
      mockRepo.getPublishedGoals.mockResolvedValue([]);
      mockRepo.getTodayRoutineSteps.mockResolvedValue(sampleRoutineSteps);

      let result = await service.getConsumerDashboard(authUserId);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.setupProgress.steps.hasPublishedRoutine).toBe(true);
      }

      // Test draft
      mockRepo.getUserDashboardData.mockResolvedValue({
        ...baseDashboardData,
        routineId: "routine-1",
        routineStatus: "draft",
      });

      result = await service.getConsumerDashboard(authUserId);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.setupProgress.steps.hasPublishedRoutine).toBe(false);
      }
    });

    it("returns goals array when template is published with goals", async () => {
      // Given
      mockRepo.getUserDashboardData.mockResolvedValue({
        ...baseDashboardData,
        goalsTemplateId: "template-1",
        goalsTemplateStatus: "published",
      });
      mockRepo.getPublishedGoals.mockResolvedValue(sampleGoals);
      mockRepo.getTodayRoutineSteps.mockResolvedValue([]);

      // When
      const result = await service.getConsumerDashboard(authUserId);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.goals).toEqual(sampleGoals);
        expect(result.data.goals).toHaveLength(2);
      }
    });

    it("returns empty goals array when template is published but has no goals", async () => {
      // Given
      mockRepo.getUserDashboardData.mockResolvedValue({
        ...baseDashboardData,
        goalsTemplateId: "template-1",
        goalsTemplateStatus: "published",
      });
      mockRepo.getPublishedGoals.mockResolvedValue([]); // Empty goals array
      mockRepo.getTodayRoutineSteps.mockResolvedValue([]);

      // When
      const result = await service.getConsumerDashboard(authUserId);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.goals).toEqual([]); // Should return empty array when published
        expect(result.data.setupProgress.steps.hasPublishedGoals).toBe(true);
      }
    });

    it("returns routine steps when published routine has today's steps", async () => {
      // Given
      mockRepo.getUserDashboardData.mockResolvedValue({
        ...baseDashboardData,
        routineId: "routine-1",
        routineStatus: "published",
      });
      mockRepo.getPublishedGoals.mockResolvedValue([]);
      mockRepo.getTodayRoutineSteps.mockResolvedValue(sampleRoutineSteps);

      // When
      const result = await service.getConsumerDashboard(authUserId);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.todayRoutine).toEqual(sampleRoutineSteps);
        expect(result.data.todayRoutine).toHaveLength(1);
      }
    });

    it("uses injected date for determining today", async () => {
      // Given
      const customDate = new Date("2025-02-14");
      const customDeps = {
        ...deps,
        now: () => customDate,
      };
      const customService = makeDashboardService(customDeps);

      mockRepo.getUserDashboardData.mockResolvedValue({
        ...baseDashboardData,
        routineId: "routine-1",
        routineStatus: "published",
      });
      mockRepo.getPublishedGoals.mockResolvedValue([]);
      mockRepo.getTodayRoutineSteps.mockResolvedValue([]);

      // When
      await customService.getConsumerDashboard(authUserId);

      // Then
      expect(mockRepo.getTodayRoutineSteps).toHaveBeenCalledWith(
        authUserId,
        customDate,
      );
    });

    it("includes profile tags in user object when tags exist", async () => {
      // Given
      mockRepo.getUserDashboardData.mockResolvedValue(baseDashboardData);
      mockRepo.getPublishedGoals.mockResolvedValue([]);
      mockRepo.getTodayRoutineSteps.mockResolvedValue([]);
      mockRepo.getProfileTags.mockResolvedValue([
        "Allergic to fragrance",
        "Sensitive skin",
      ]);

      // When
      const result = await service.getConsumerDashboard(authUserId);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user.profileTags).toEqual([
          "Allergic to fragrance",
          "Sensitive skin",
        ]);
      }
    });

    it("includes empty array for profile tags when user has no tags", async () => {
      // Given
      mockRepo.getUserDashboardData.mockResolvedValue(baseDashboardData);
      mockRepo.getPublishedGoals.mockResolvedValue([]);
      mockRepo.getTodayRoutineSteps.mockResolvedValue([]);
      mockRepo.getProfileTags.mockResolvedValue([]);

      // When
      const result = await service.getConsumerDashboard(authUserId);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user.profileTags).toEqual([]);
      }
    });

    it("fetches profile tags in parallel with other data", async () => {
      // Given
      mockRepo.getUserDashboardData.mockResolvedValue(baseDashboardData);
      mockRepo.getPublishedGoals.mockResolvedValue([]);
      mockRepo.getTodayRoutineSteps.mockResolvedValue([]);
      mockRepo.getProfileTags.mockResolvedValue([
        "Allergic to fragrance",
        "Sensitive skin",
      ]);

      // When
      await service.getConsumerDashboard(authUserId);

      // Then - Verify getProfileTags was called with correct userProfileId
      expect(mockRepo.getProfileTags).toHaveBeenCalledWith(profileId);
    });

    it("includes profile tags in response with multiple tags", async () => {
      // Given
      mockRepo.getUserDashboardData.mockResolvedValue(baseDashboardData);
      mockRepo.getPublishedGoals.mockResolvedValue([]);
      mockRepo.getTodayRoutineSteps.mockResolvedValue([]);
      mockRepo.getProfileTags.mockResolvedValue([
        "Allergic to fragrance",
        "Sensitive skin",
        "Prefers natural products",
        "Dry skin type",
      ]);

      // When
      const result = await service.getConsumerDashboard(authUserId);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user.profileTags).toHaveLength(4);
        expect(result.data.user.profileTags).toEqual([
          "Allergic to fragrance",
          "Sensitive skin",
          "Prefers natural products",
          "Dry skin type",
        ]);
      }
    });
  });
});
