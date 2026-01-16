// Tests for POST /api/consumer-app/surveys/[id]/responses and GET

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "../route";
import * as surveysService from "@/app/api/admin/surveys/surveys.service";
import type { MockSurveysService } from "@/app/api/admin/surveys/__tests__/test-types";

// Mock dependencies
vi.mock("@/app/api/admin/surveys/surveys.service");
vi.mock("../../../../shared/auth", () => ({
  validateApiKey: vi.fn(),
}));

import { validateApiKey } from "../../../../shared/auth";

describe("POST /api/consumer-app/surveys/[id]/responses", () => {
  const mockMakeSurveysService = vi.mocked(surveysService.makeSurveysService);

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: API key is valid
    vi.mocked(validateApiKey).mockResolvedValue(true);
  });

  it("should submit responses successfully", async () => {
    const mockService = {
      submitResponses: vi.fn().mockResolvedValue({
        success: true,
        data: {
          submissionId: "submission-123",
          submittedAt: new Date("2024-01-01T12:00:00Z"),
          responsesCount: 2,
        },
      }),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/surveys/survey-123/responses",
      {
        method: "POST",
        body: JSON.stringify({
          userId: "450e8400-e29b-41d4-a716-446655440000",
          responses: [
            {
              questionId: "550e8400-e29b-41d4-a716-446655440001",
              yesNoAnswer: true,
            },
            {
              questionId: "550e8400-e29b-41d4-a716-446655440002",
              freehandAnswer: "Great service!",
            },
          ],
        }),
      },
    );

    const params = Promise.resolve({ id: "survey-123" });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.message).toBe("Survey responses submitted successfully");
    expect(data.submissionId).toBe("submission-123");
    expect(data.responsesCount).toBe(2);

    expect(mockService.submitResponses).toHaveBeenCalledWith({
      userId: "450e8400-e29b-41d4-a716-446655440000",
      surveyId: "survey-123",
      responses: [
        {
          questionId: "550e8400-e29b-41d4-a716-446655440001",
          yesNoAnswer: true,
          freehandAnswer: null,
        },
        {
          questionId: "550e8400-e29b-41d4-a716-446655440002",
          yesNoAnswer: null,
          freehandAnswer: "Great service!",
        },
      ],
    });
  });

  it("should return 400 for invalid request body", async () => {
    const mockService = {
      submitResponses: vi.fn(),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/surveys/survey-123/responses",
      {
        method: "POST",
        body: JSON.stringify({
          // Missing userId
          responses: [],
        }),
      },
    );

    const params = Promise.resolve({ id: "survey-123" });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("INVALID_REQUEST");
    expect(mockService.submitResponses).not.toHaveBeenCalled();
  });

  it("should return 400 for empty responses array", async () => {
    const mockService = {
      submitResponses: vi.fn(),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/surveys/survey-123/responses",
      {
        method: "POST",
        body: JSON.stringify({
          userId: "user-123",
          responses: [],
        }),
      },
    );

    const params = Promise.resolve({ id: "survey-123" });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("INVALID_REQUEST");
  });

  it("should return 400 for invalid UUID format", async () => {
    const mockService = {
      submitResponses: vi.fn(),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/surveys/survey-123/responses",
      {
        method: "POST",
        body: JSON.stringify({
          userId: "invalid-uuid",
          responses: [
            {
              questionId: "q1",
              yesNoAnswer: true,
            },
          ],
        }),
      },
    );

    const params = Promise.resolve({ id: "survey-123" });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("INVALID_REQUEST");
  });

  it("should return 500 when service returns error", async () => {
    const mockService = {
      submitResponses: vi.fn().mockResolvedValue({
        success: false,
        error: "Survey not found",
      }),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/surveys/survey-123/responses",
      {
        method: "POST",
        body: JSON.stringify({
          userId: "450e8400-e29b-41d4-a716-446655440000",
          responses: [
            {
              questionId: "550e8400-e29b-41d4-a716-446655440000",
              yesNoAnswer: true,
            },
          ],
        }),
      },
    );

    const params = Promise.resolve({ id: "survey-123" });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe("INTERNAL_ERROR");
    expect(data.error.message).toBe("Survey not found");
  });

  it("should handle unexpected errors", async () => {
    const mockService = {
      submitResponses: vi.fn().mockRejectedValue(new Error("Database failure")),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/surveys/survey-123/responses",
      {
        method: "POST",
        body: JSON.stringify({
          userId: "450e8400-e29b-41d4-a716-446655440000",
          responses: [
            {
              questionId: "550e8400-e29b-41d4-a716-446655440000",
              yesNoAnswer: true,
            },
          ],
        }),
      },
    );

    const params = Promise.resolve({ id: "survey-123" });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe("INTERNAL_ERROR");
    expect(data.error.message).toBe("An internal error occurred");
  });

  it("should handle mixed response types correctly", async () => {
    const mockService = {
      submitResponses: vi.fn().mockResolvedValue({
        success: true,
        data: {
          submissionId: "submission-456",
          submittedAt: new Date("2024-01-02T10:30:00Z"),
          responsesCount: 3,
        },
      }),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/surveys/survey-123/responses",
      {
        method: "POST",
        body: JSON.stringify({
          userId: "450e8400-e29b-41d4-a716-446655440000",
          responses: [
            {
              questionId: "550e8400-e29b-41d4-a716-446655440001",
              yesNoAnswer: true,
            },
            {
              questionId: "550e8400-e29b-41d4-a716-446655440002",
              yesNoAnswer: false,
            },
            {
              questionId: "550e8400-e29b-41d4-a716-446655440003",
              freehandAnswer: "Excellent experience",
            },
          ],
        }),
      },
    );

    const params = Promise.resolve({ id: "survey-123" });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.responsesCount).toBe(3);

    const expectedCall = mockService.submitResponses.mock.calls[0][0];
    expect(expectedCall.responses).toHaveLength(3);
    expect(expectedCall.responses[0].yesNoAnswer).toBe(true);
    expect(expectedCall.responses[0].freehandAnswer).toBeNull();
    expect(expectedCall.responses[2].yesNoAnswer).toBeNull();
    expect(expectedCall.responses[2].freehandAnswer).toBe(
      "Excellent experience",
    );
  });
});

describe("GET /api/consumer-app/surveys/[id]/responses", () => {
  const mockMakeSurveysService = vi.mocked(surveysService.makeSurveysService);

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: API key is valid
    vi.mocked(validateApiKey).mockResolvedValue(true);
  });

  it("should get user submission history successfully", async () => {
    const mockService = {
      getUserSubmissionHistory: vi.fn().mockResolvedValue({
        success: true,
        data: {
          surveyId: "survey-123",
          userId: "user-123",
          submissions: [
            {
              submissionId: "sub-1",
              submittedAt: new Date("2024-01-01T12:00:00Z"),
              responses: [
                {
                  questionId: "q1",
                  questionText: "Do you like it?",
                  questionType: "yes_no",
                  yesNoAnswer: true,
                  freehandAnswer: null,
                },
              ],
            },
          ],
        },
      }),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/surveys/survey-123/responses?userId=user-123",
    );
    const params = Promise.resolve({ id: "survey-123" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.surveyId).toBe("survey-123");
    expect(data.userId).toBe("user-123");
    expect(data.submissions).toHaveLength(1);
    expect(mockService.getUserSubmissionHistory).toHaveBeenCalledWith(
      "survey-123",
      "user-123",
    );
  });

  it("should return 400 when userId is missing", async () => {
    const mockService = {
      getUserSubmissionHistory: vi.fn(),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/surveys/survey-123/responses",
    );
    const params = Promise.resolve({ id: "survey-123" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("INVALID_REQUEST");
    expect(data.error.message).toBe("userId query parameter is required");
    expect(mockService.getUserSubmissionHistory).not.toHaveBeenCalled();
  });

  it("should return 500 when service returns error", async () => {
    const mockService = {
      getUserSubmissionHistory: vi.fn().mockResolvedValue({
        success: false,
        error: "Database error",
      }),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/surveys/survey-123/responses?userId=user-123",
    );
    const params = Promise.resolve({ id: "survey-123" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe("INTERNAL_ERROR");
    expect(data.error.message).toBe("Database error");
  });

  it("should handle unexpected errors", async () => {
    const mockService = {
      getUserSubmissionHistory: vi
        .fn()
        .mockRejectedValue(new Error("Unexpected")),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/surveys/survey-123/responses?userId=user-123",
    );
    const params = Promise.resolve({ id: "survey-123" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe("INTERNAL_ERROR");
    expect(data.error.message).toBe("An internal error occurred");
  });

  it("should handle user with no submissions", async () => {
    const mockService = {
      getUserSubmissionHistory: vi.fn().mockResolvedValue({
        success: true,
        data: {
          surveyId: "survey-123",
          userId: "user-456",
          submissions: [],
        },
      }),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/surveys/survey-123/responses?userId=user-456",
    );
    const params = Promise.resolve({ id: "survey-123" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.submissions).toHaveLength(0);
  });

  it("should handle multiple submissions from same user", async () => {
    const mockService = {
      getUserSubmissionHistory: vi.fn().mockResolvedValue({
        success: true,
        data: {
          surveyId: "survey-123",
          userId: "user-123",
          submissions: [
            {
              submissionId: "sub-1",
              submittedAt: new Date("2024-01-01T12:00:00Z"),
              responses: [
                {
                  questionId: "q1",
                  questionText: "Question 1",
                  questionType: "yes_no",
                  yesNoAnswer: true,
                  freehandAnswer: null,
                },
              ],
            },
            {
              submissionId: "sub-2",
              submittedAt: new Date("2024-01-02T14:30:00Z"),
              responses: [
                {
                  questionId: "q1",
                  questionText: "Question 1",
                  questionType: "yes_no",
                  yesNoAnswer: false,
                  freehandAnswer: null,
                },
              ],
            },
          ],
        },
      }),
    };

    mockMakeSurveysService.mockReturnValue(
      mockService as unknown as MockSurveysService,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/consumer-app/surveys/survey-123/responses?userId=user-123",
    );
    const params = Promise.resolve({ id: "survey-123" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.submissions).toHaveLength(2);
    expect(data.submissions[0].submissionId).toBe("sub-1");
    expect(data.submissions[1].submissionId).toBe("sub-2");
  });
});
