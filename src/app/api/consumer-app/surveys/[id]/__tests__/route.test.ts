// Tests for GET /api/consumer-app/surveys/[id]

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import * as surveysService from "@/app/api/admin/surveys/surveys.service";
import type { MockSurveysService } from "@/app/api/admin/surveys/__tests__/test-types";

// Mock the surveys service
vi.mock("@/app/api/admin/surveys/surveys.service");

describe("GET /api/consumer-app/surveys/[id]", () => {
  const mockMakeSurveysService = vi.mocked(surveysService.makeSurveysService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return survey with consumer-relevant fields only", async () => {
    const mockService = {
      getSurvey: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: "survey-id-123",
          title: "Customer Survey",
          description: "Tell us what you think",
          status: "published",
          createdBy: "admin-id",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          questions: [
            {
              id: "q1",
              surveyId: "survey-id-123",
              questionText: "Do you like our service?",
              questionType: "yes_no",
              helperText: "Be honest",
              isRequired: true,
              order: 0,
              createdAt: new Date("2024-01-01"),
              updatedAt: new Date("2024-01-01"),
            },
            {
              id: "q2",
              surveyId: "survey-id-123",
              questionText: "Any suggestions?",
              questionType: "freehand",
              helperText: null,
              isRequired: false,
              order: 1,
              createdAt: new Date("2024-01-01"),
              updatedAt: new Date("2024-01-01"),
            },
          ],
        },
      }),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/surveys/survey-id-123",
    );
    const params = Promise.resolve({ id: "survey-id-123" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("survey-id-123");
    expect(data.title).toBe("Customer Survey");
    expect(data.description).toBe("Tell us what you think");

    // Should NOT include admin fields
    expect(data.status).toBeUndefined();
    expect(data.createdBy).toBeUndefined();
    expect(data.createdAt).toBeUndefined();
    expect(data.updatedAt).toBeUndefined();

    // Questions should only have consumer-relevant fields
    expect(data.questions).toHaveLength(2);
    expect(data.questions[0]).toEqual({
      id: "q1",
      questionText: "Do you like our service?",
      questionType: "yes_no",
      helperText: "Be honest",
      isRequired: true,
      order: 0,
    });
    expect(data.questions[0].surveyId).toBeUndefined();
    expect(data.questions[0].createdAt).toBeUndefined();

    expect(mockService.getSurvey).toHaveBeenCalledWith("survey-id-123");
  });

  it("should return 404 when survey not found", async () => {
    const mockService = {
      getSurvey: vi.fn().mockResolvedValue({
        success: false,
        error: "Survey not found",
      }),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/surveys/non-existent",
    );
    const params = Promise.resolve({ id: "non-existent" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
    expect(data.error.message).toBe("Survey not found");
  });

  it("should return 500 for other service errors", async () => {
    const mockService = {
      getSurvey: vi.fn().mockResolvedValue({
        success: false,
        error: "Database error",
      }),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/surveys/survey-id-123",
    );
    const params = Promise.resolve({ id: "survey-id-123" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe("INTERNAL_ERROR");
    expect(data.error.message).toBe("Database error");
  });

  it("should handle unexpected errors", async () => {
    const mockService = {
      getSurvey: vi.fn().mockRejectedValue(new Error("Unexpected")),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/surveys/survey-id-123",
    );
    const params = Promise.resolve({ id: "survey-id-123" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe("INTERNAL_ERROR");
    expect(data.error.message).toBe("An internal error occurred");
  });

  it("should handle survey with null helper text properly", async () => {
    const mockService = {
      getSurvey: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: "survey-id-123",
          title: "Simple Survey",
          description: null,
          status: "published",
          createdBy: "admin-id",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          questions: [
            {
              id: "q1",
              surveyId: "survey-id-123",
              questionText: "Question without helper",
              questionType: "yes_no",
              helperText: null,
              isRequired: true,
              order: 0,
              createdAt: new Date("2024-01-01"),
              updatedAt: new Date("2024-01-01"),
            },
          ],
        },
      }),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/surveys/survey-id-123",
    );
    const params = Promise.resolve({ id: "survey-id-123" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.questions[0].helperText).toBeNull();
  });
});
