// POST /api/consumer-app/surveys/[id]/responses - Submit survey responses

import { NextRequest, NextResponse } from "next/server";
import { makeSurveysService } from "@/app/api/admin/surveys/surveys.service";
import { submitResponsesRequestSchema } from "../../surveys.types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Step 1: Get survey ID from params
    const { id: surveyId } = await params;

    // Step 2: Parse and validate request body
    const body = await request.json();
    const validation = submitResponsesRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: validation.error.issues[0].message,
            details: validation.error.issues,
          },
        },
        { status: 400 },
      );
    }

    const validatedData = validation.data;

    // Step 3: Call service to submit responses
    const service = makeSurveysService();
    const result = await service.submitResponses({
      userId: validatedData.userId,
      surveyId,
      responses: validatedData.responses.map((r) => ({
        questionId: r.questionId,
        yesNoAnswer: r.yesNoAnswer ?? null,
        freehandAnswer: r.freehandAnswer ?? null,
      })),
    });

    // Step 4: Handle service errors
    if (!result.success) {
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
    return NextResponse.json(
      {
        message: "Survey responses submitted successfully",
        ...result.data,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[SubmitResponsesRoute] Unexpected error:", error);
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

// GET /api/consumer-app/surveys/[id]/responses?userId=xxx - Get user's submission history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Step 1: Get survey ID from params
    const { id: surveyId } = await params;

    // Step 2: Get userId from query params
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "userId query parameter is required",
          },
        },
        { status: 400 },
      );
    }

    // Step 3: Call service to get submission history
    const service = makeSurveysService();
    const result = await service.getUserSubmissionHistory(surveyId, userId);

    // Step 4: Handle service errors
    if (!result.success) {
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
    console.error("[GetSubmissionHistoryRoute] Unexpected error:", error);
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
