// Tests for POST /api/admin/surveys

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import * as surveysService from "../surveys.service";
import type { MockSurveysService } from "./test-types";

// Mock the surveys service
vi.mock("../surveys.service");

describe("POST /api/admin/surveys", () => {
  const mockMakeSurveysService = vi.mocked(surveysService.makeSurveysService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a survey successfully with valid data", async () => {
    const mockService = {
      createSurveyWithQuestions: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: "survey-id-123",
          title: "Test Survey",
          description: null,
          status: "draft",
          createdBy: "450e8400-e29b-41d4-a716-446655440000",
          questions: [
            {
              id: "question-id-1",
              surveyId: "survey-id-123",
              questionText: "Do you like this?",
              questionType: "yes_no",
              helperText: null,
              isRequired: true,
              order: 0,
            },
          ],
        },
      }),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest("http://localhost:3000/api/admin/surveys", {
      method: "POST",
      body: JSON.stringify({
        title: "Test Survey",
        status: "draft",
        questions: [
          {
            questionText: "Do you like this?",
            questionType: "yes_no",
            isRequired: true,
            order: 1,
          },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe("survey-id-123");
    expect(data.title).toBe("Test Survey");
    expect(data.questions).toHaveLength(1);
    expect(mockService.createSurveyWithQuestions).toHaveBeenCalledWith({
      title: "Test Survey",
      description: null,
      status: "draft",
      createdBy: "450e8400-e29b-41d4-a716-446655440000",
      questions: [
        {
          questionText: "Do you like this?",
          questionType: "yes_no",
          helperText: null,
          isRequired: true,
          order: 1,
        },
      ],
    });
  });

  it("should return 400 for invalid request body", async () => {
    const mockService = {
      createSurveyWithQuestions: vi.fn(),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest("http://localhost:3000/api/admin/surveys", {
      method: "POST",
      body: JSON.stringify({
        // Missing title
        status: "draft",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("INVALID_REQUEST");
    expect(mockService.createSurveyWithQuestions).not.toHaveBeenCalled();
  });

  it("should return 500 when service returns error", async () => {
    const mockService = {
      createSurveyWithQuestions: vi.fn().mockResolvedValue({
        success: false,
        error: "Database connection failed",
      }),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest("http://localhost:3000/api/admin/surveys", {
      method: "POST",
      body: JSON.stringify({
        title: "Test Survey",
        status: "draft",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe("INTERNAL_ERROR");
    expect(data.error.message).toBe("Database connection failed");
  });

  it("should handle unexpected errors", async () => {
    const mockService = {
      createSurveyWithQuestions: vi
        .fn()
        .mockRejectedValue(new Error("Unexpected error")),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest("http://localhost:3000/api/admin/surveys", {
      method: "POST",
      body: JSON.stringify({
        title: "Test Survey",
        status: "draft",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe("INTERNAL_ERROR");
    expect(data.error.message).toBe("An internal error occurred");
  });

  it("should handle survey with description and multiple questions", async () => {
    const mockService = {
      createSurveyWithQuestions: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: "survey-id-123",
          title: "Customer Feedback",
          description: "Tell us about your experience",
          status: "published",
          createdBy: "450e8400-e29b-41d4-a716-446655440000",
          questions: [
            {
              id: "q1",
              surveyId: "survey-id-123",
              questionText: "Are you satisfied?",
              questionType: "yes_no",
              helperText: "Select yes or no",
              isRequired: true,
              order: 1,
            },
            {
              id: "q2",
              surveyId: "survey-id-123",
              questionText: "Additional comments?",
              questionType: "freehand",
              helperText: null,
              isRequired: false,
              order: 2,
            },
          ],
        },
      }),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest("http://localhost:3000/api/admin/surveys", {
      method: "POST",
      body: JSON.stringify({
        title: "Customer Feedback",
        description: "Tell us about your experience",
        status: "published",
        questions: [
          {
            questionText: "Are you satisfied?",
            questionType: "yes_no",
            helperText: "Select yes or no",
            isRequired: true,
            order: 1,
          },
          {
            questionText: "Additional comments?",
            questionType: "freehand",
            isRequired: false,
            order: 2,
          },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.title).toBe("Customer Feedback");
    expect(data.description).toBe("Tell us about your experience");
    expect(data.questions).toHaveLength(2);
  });
});
