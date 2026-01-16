import { NextResponse } from "next/server";
import { makeSurveysService } from "@/app/api/admin/surveys/surveys.service";
import { validateApiKey } from "../shared/auth";

/**
 * GET /api/consumer-app/surveys
 * Get the published survey for consumers
 */
export async function GET() {
  try {
    // Validate API key
    const isValid = await validateApiKey();
    if (!isValid) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid API key" } },
        { status: 401 },
      );
    }

    // Get published survey
    const service = makeSurveysService();
    const result = await service.getPublishedSurvey();

    if (!result.success) {
      // Check for specific error messages
      if (result.error === "No published survey found") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: result.error } },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: result.error } },
        { status: 500 },
      );
    }

    // Return only consumer-relevant fields (exclude admin fields)

    const {
      createdBy,
      updatedBy,
      status,
      createdAt,
      updatedAt,
      ...surveyData
    } = result.data;

    // Also strip admin fields from questions
    const consumerQuestions = result.data.questions.map(
      ({
        createdAt: _qCreatedAt,
        updatedAt: _qUpdatedAt,
        surveyId: _surveyId,
        ...question
      }) => question,
    );

    return NextResponse.json(
      {
        ...surveyData,
        questions: consumerQuestions,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching published survey:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      },
      { status: 500 },
    );
  }
}
