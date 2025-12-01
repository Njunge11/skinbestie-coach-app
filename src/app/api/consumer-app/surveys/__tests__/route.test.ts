// Tests for GET /api/consumer-app/surveys (get published survey)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import * as surveysService from "@/app/api/admin/surveys/surveys.service";
import type { MockSurveysService } from "@/app/api/admin/surveys/__tests__/test-types";

// Mock dependencies
vi.mock("@/app/api/admin/surveys/surveys.service");
vi.mock("../../shared/auth", () => ({
  validateApiKey: vi.fn(),
}));

import { validateApiKey } from "../../shared/auth";

describe("GET /api/consumer-app/surveys", () => {
  const mockMakeSurveysService = vi.mocked(surveysService.makeSurveysService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when API key is invalid", async () => {
    // Given
    vi.mocked(validateApiKey).mockResolvedValue(false);

    // When
    const response = await GET();
    const data = await response.json();

    // Then
    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 404 when no published survey exists", async () => {
    // Given
    vi.mocked(validateApiKey).mockResolvedValue(true);
    const mockService = {
      getPublishedSurvey: vi.fn().mockResolvedValue({
        success: false,
        error: "No published survey found",
      }),
    };
    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    // When
    const response = await GET();
    const data = await response.json();

    // Then
    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("returns published survey with consumer-relevant fields only", async () => {
    // Given
    vi.mocked(validateApiKey).mockResolvedValue(true);
    const mockService = {
      getPublishedSurvey: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: "survey-id-123",
          title: "Share Feedback",
          description: null,
          status: "published",
          createdBy: "admin-id",
          updatedBy: "admin-id",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          questions: [
            {
              id: "q1",
              surveyId: "survey-id-123",
              questionText: "Has your skin improved?",
              questionType: "yes_no" as const,
              helperText: null,
              isRequired: true,
              order: 1,
              createdAt: new Date("2024-01-01"),
              updatedAt: new Date("2024-01-01"),
            },
            {
              id: "q2",
              surveyId: "survey-id-123",
              questionText: "Any feedback?",
              questionType: "freehand" as const,
              helperText: null,
              isRequired: false,
              order: 2,
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

    // When
    const response = await GET();
    const data = await response.json();

    // Then
    expect(response.status).toBe(200);
    expect(data).toEqual({
      id: "survey-id-123",
      title: "Share Feedback",
      description: null,
      questions: [
        {
          id: "q1",
          questionText: "Has your skin improved?",
          questionType: "yes_no",
          helperText: null,
          isRequired: true,
          order: 1,
        },
        {
          id: "q2",
          questionText: "Any feedback?",
          questionType: "freehand",
          helperText: null,
          isRequired: false,
          order: 2,
        },
      ],
    });

    // Should not include admin fields
    expect(data.createdBy).toBeUndefined();
    expect(data.status).toBeUndefined();
    expect(data.createdAt).toBeUndefined();
  });

  it("returns 500 when service throws unexpected error", async () => {
    // Given
    vi.mocked(validateApiKey).mockResolvedValue(true);
    const mockService = {
      getPublishedSurvey: vi.fn().mockResolvedValue({
        success: false,
        error: "Database connection failed",
      }),
    };
    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    // When
    const response = await GET();
    const data = await response.json();

    // Then
    expect(response.status).toBe(500);
    expect(data.error.code).toBe("INTERNAL_ERROR");
  });
});
