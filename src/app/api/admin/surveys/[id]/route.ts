// GET /api/admin/surveys/[id] - Get survey with questions

import { NextRequest, NextResponse } from "next/server";
import { makeSurveysService } from "../surveys.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Step 1: Check authentication (admin only)
    // TODO: Add proper authentication check
    // For now, skip auth check for development

    // Step 2: Get survey ID from params
    const { id: surveyId } = await params;

    // Step 3: Call service to get survey
    const service = makeSurveysService();
    const result = await service.getSurvey(surveyId);

    // Step 4: Handle service errors
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

    // Step 5: Return success response
    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    console.error("[GetSurveyRoute] Unexpected error:", error);
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
