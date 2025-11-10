import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeSurveysService } from "../surveys.service";
import type { SurveysRepo } from "../surveys.repo";
import { type db as defaultDb } from "@/lib/db";

describe("Surveys Service - Unit Tests", () => {
  let service: ReturnType<typeof makeSurveysService>;
  let mockRepo: {
    createSurvey: ReturnType<typeof vi.fn>;
    getSurveyWithQuestions: ReturnType<typeof vi.fn>;
    addQuestions: ReturnType<typeof vi.fn>;
    submitSurveyResponses: ReturnType<typeof vi.fn>;
    getUserSubmissions: ReturnType<typeof vi.fn>;
  };
  let mockDb: ReturnType<typeof vi.fn>;

  // Test UUIDs
  const adminId = "450e8400-e29b-41d4-a716-446655440000";
  const survey1Id = "850e8400-e29b-41d4-a716-446655440001";
  const question1Id = "950e8400-e29b-41d4-a716-446655440001";
  const user1Id = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    mockRepo = {
      createSurvey: vi.fn(),
      getSurveyWithQuestions: vi.fn(),
      addQuestions: vi.fn(),
      submitSurveyResponses: vi.fn(),
      getUserSubmissions: vi.fn(),
    };

    mockDb = vi.fn();

    service = makeSurveysService({
      repo: mockRepo as unknown as SurveysRepo,
      db: mockDb as unknown as typeof defaultDb,
    });
  });

  describe("createSurveyWithQuestions", () => {
    it("creates survey and questions successfully", async () => {
      const surveyData = {
        title: "Week 4 Check-in",
        description: "How is your routine?",
        status: "draft" as const,
        createdBy: adminId,
        questions: [
          {
            questionText: "Are you seeing improvements?",
            questionType: "yes_no" as const,
            helperText: null,
            isRequired: true,
            order: 1,
          },
          {
            questionText: "What changes?",
            questionType: "freehand" as const,
            helperText: "Be specific",
            isRequired: false,
            order: 2,
          },
        ],
      };

      // Mock repo responses
      mockRepo.createSurvey.mockResolvedValue({
        id: survey1Id,
        title: "Week 4 Check-in",
        description: "How is your routine?",
        status: "draft",
        createdBy: adminId,
        updatedBy: adminId,
        createdAt: new Date("2025-11-05T10:00:00Z"),
        updatedAt: new Date("2025-11-05T10:00:00Z"),
      });

      mockRepo.addQuestions.mockResolvedValue([
        {
          id: question1Id,
          surveyId: survey1Id,
          questionText: "Are you seeing improvements?",
          questionType: "yes_no",
          helperText: null,
          isRequired: true,
          order: 1,
          createdAt: new Date("2025-11-05T10:00:00Z"),
          updatedAt: new Date("2025-11-05T10:00:00Z"),
        },
        {
          id: "950e8400-e29b-41d4-a716-446655440002",
          surveyId: survey1Id,
          questionText: "What changes?",
          questionType: "freehand",
          helperText: "Be specific",
          isRequired: false,
          order: 2,
          createdAt: new Date("2025-11-05T10:00:00Z"),
          updatedAt: new Date("2025-11-05T10:00:00Z"),
        },
      ]);

      const result = await service.createSurveyWithQuestions(surveyData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(survey1Id);
        expect(result.data.title).toBe("Week 4 Check-in");
        expect(result.data.questions).toHaveLength(2);
      }

      // Verify repo calls
      expect(mockRepo.createSurvey).toHaveBeenCalledWith({
        title: "Week 4 Check-in",
        description: "How is your routine?",
        status: "draft",
        createdBy: adminId,
        updatedBy: adminId,
      });

      expect(mockRepo.addQuestions).toHaveBeenCalledWith(
        survey1Id,
        surveyData.questions,
      );
    });

    it("returns error when title is empty", async () => {
      const result = await service.createSurveyWithQuestions({
        title: "",
        description: null,
        status: "draft",
        createdBy: adminId,
        questions: [],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid");
      }

      expect(mockRepo.createSurvey).not.toHaveBeenCalled();
    });

    it("handles repository errors", async () => {
      mockRepo.createSurvey.mockRejectedValue(new Error("DB error"));

      const result = await service.createSurveyWithQuestions({
        title: "Test",
        description: null,
        status: "draft",
        createdBy: adminId,
        questions: [],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to create survey");
      }
    });
  });

  describe("getSurvey", () => {
    it("returns survey when found", async () => {
      mockRepo.getSurveyWithQuestions.mockResolvedValue({
        id: survey1Id,
        title: "Test Survey",
        description: null,
        status: "published",
        createdBy: adminId,
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
        questions: [
          {
            id: question1Id,
            surveyId: survey1Id,
            questionText: "Question 1",
            questionType: "yes_no",
            helperText: null,
            isRequired: true,
            order: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const result = await service.getSurvey(survey1Id);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(survey1Id);
        expect(result.data.questions).toHaveLength(1);
      }
    });

    it("returns error when survey not found", async () => {
      mockRepo.getSurveyWithQuestions.mockResolvedValue(null);

      const result = await service.getSurvey(survey1Id);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Survey not found");
      }
    });

    it("handles repository errors", async () => {
      mockRepo.getSurveyWithQuestions.mockRejectedValue(new Error("DB error"));

      const result = await service.getSurvey(survey1Id);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to get survey");
      }
    });
  });

  describe("submitResponses", () => {
    it("submits responses successfully", async () => {
      const responsesData = {
        userId: user1Id,
        surveyId: survey1Id,
        responses: [
          {
            questionId: question1Id,
            yesNoAnswer: true,
            freehandAnswer: null,
          },
        ],
      };

      mockRepo.submitSurveyResponses.mockResolvedValue({
        submissionId: "sub-123",
        submittedAt: new Date("2025-11-05T10:00:00Z"),
        responsesCount: 1,
      });

      const result = await service.submitResponses(responsesData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.submissionId).toBe("sub-123");
        expect(result.data.responsesCount).toBe(1);
      }

      expect(mockRepo.submitSurveyResponses).toHaveBeenCalledWith(
        survey1Id,
        user1Id,
        responsesData.responses,
        mockDb,
      );
    });

    it("returns error when responses array is empty", async () => {
      const result = await service.submitResponses({
        userId: user1Id,
        surveyId: survey1Id,
        responses: [],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid");
      }

      expect(mockRepo.submitSurveyResponses).not.toHaveBeenCalled();
    });

    it("handles repository errors", async () => {
      mockRepo.submitSurveyResponses.mockRejectedValue(new Error("DB error"));

      const result = await service.submitResponses({
        userId: user1Id,
        surveyId: survey1Id,
        responses: [
          {
            questionId: question1Id,
            yesNoAnswer: true,
            freehandAnswer: null,
          },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to submit responses");
      }
    });
  });

  describe("getUserSubmissionHistory", () => {
    it("returns submission history", async () => {
      mockRepo.getUserSubmissions.mockResolvedValue([
        {
          submissionId: "sub-1",
          submittedAt: new Date("2025-11-05T10:00:00Z"),
          responses: [
            {
              questionId: question1Id,
              questionText: "Question 1",
              questionType: "yes_no",
              yesNoAnswer: true,
              freehandAnswer: null,
            },
          ],
        },
      ]);

      const result = await service.getUserSubmissionHistory(survey1Id, user1Id);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.submissions).toHaveLength(1);
        expect(result.data.submissions[0].submissionId).toBe("sub-1");
      }
    });

    it("returns empty array when no submissions", async () => {
      mockRepo.getUserSubmissions.mockResolvedValue([]);

      const result = await service.getUserSubmissionHistory(survey1Id, user1Id);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.submissions).toEqual([]);
      }
    });

    it("handles repository errors", async () => {
      mockRepo.getUserSubmissions.mockRejectedValue(new Error("DB error"));

      const result = await service.getUserSubmissionHistory(survey1Id, user1Id);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to get submission history");
      }
    });
  });
});
