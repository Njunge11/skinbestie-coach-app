// GET /api/consumer-app/surveys/[id] - Get survey for user to answer

import { NextRequest, NextResponse } from "next/server";
import { makeSurveysService } from "@/app/api/admin/surveys/surveys.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Step 1: Get survey ID from params
    const { id: surveyId } = await params;

    // Step 2: Call service to get survey
    const service = makeSurveysService();
    const result = await service.getSurvey(surveyId);

    // Step 3: Handle service errors
    if (!result.success) {
      if (result.error === "Survey not found") {
        return NextResponse.json(
          {
            error: {
              code: "NOT_FOUND",
              message: result.error,
            },
          },
          { status: 404 },
        );
      }

      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: result.error,
          },
        },
        { status: 500 },
      );
    }

    // Step 4: Return survey (only include fields needed by consumer)
    const { id, title, description, questions } = result.data;

    return NextResponse.json(
      {
        id,
        title,
        description,
        questions: questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          helperText: q.helperText,
          isRequired: q.isRequired,
          order: q.order,
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[GetConsumerSurveyRoute] Unexpected error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An internal error occurred",
        },
      },
      { status: 500 },
    );
  }
}
