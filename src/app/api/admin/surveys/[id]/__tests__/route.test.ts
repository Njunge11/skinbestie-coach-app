// Tests for GET /api/admin/surveys/[id]

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import * as surveysService from "../../surveys.service";
import type { MockSurveysService } from "../../__tests__/test-types";

// Mock the surveys service
vi.mock("../../surveys.service");

describe("GET /api/admin/surveys/[id]", () => {
  const mockMakeSurveysService = vi.mocked(surveysService.makeSurveysService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return survey with questions successfully", async () => {
    const mockService = {
      getSurvey: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: "survey-id-123",
          title: "Test Survey",
          description: "Survey description",
          status: "published",
          createdBy: "admin-id",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          questions: [
            {
              id: "q1",
              surveyId: "survey-id-123",
              questionText: "Do you like this?",
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
      "http://localhost:3000/api/admin/surveys/survey-id-123",
    );
    const params = Promise.resolve({ id: "survey-id-123" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("survey-id-123");
    expect(data.title).toBe("Test Survey");
    expect(data.questions).toHaveLength(1);
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
      "http://localhost:3000/api/admin/surveys/non-existent-id",
    );
    const params = Promise.resolve({ id: "non-existent-id" });

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
        error: "Database connection failed",
      }),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/admin/surveys/survey-id-123",
    );
    const params = Promise.resolve({ id: "survey-id-123" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe("INTERNAL_ERROR");
    expect(data.error.message).toBe("Database connection failed");
  });

  it("should handle unexpected errors", async () => {
    const mockService = {
      getSurvey: vi.fn().mockRejectedValue(new Error("Unexpected error")),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/admin/surveys/survey-id-123",
    );
    const params = Promise.resolve({ id: "survey-id-123" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe("INTERNAL_ERROR");
    expect(data.error.message).toBe("An internal error occurred");
  });

  it("should return survey with no questions", async () => {
    const mockService = {
      getSurvey: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: "survey-id-123",
          title: "Empty Survey",
          description: null,
          status: "draft",
          createdBy: "admin-id",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          questions: [],
        },
      }),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/admin/surveys/survey-id-123",
    );
    const params = Promise.resolve({ id: "survey-id-123" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.questions).toHaveLength(0);
  });
});
