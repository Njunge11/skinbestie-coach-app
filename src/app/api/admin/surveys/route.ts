// POST /api/admin/surveys - Create survey with questions

import { NextRequest, NextResponse } from "next/server";
import { makeSurveysService } from "./surveys.service";
import { createSurveyRequestSchema } from "./surveys.types";

export async function POST(request: NextRequest) {
  try {
    // Step 1: Check authentication (admin only)
    // TODO: Add proper authentication check
    // For now, skip auth check for development

    // Step 2: Parse and validate request body
    const body = await request.json();
    const validation = createSurveyRequestSchema.safeParse(body);

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

    // Step 3: Get admin ID from session email
    // TODO: In real implementation, fetch admin from database
    // For now, we'll use a placeholder
    const adminId = "450e8400-e29b-41d4-a716-446655440000";

    // Step 4: Call service to create survey
    const service = makeSurveysService();
    const result = await service.createSurveyWithQuestions({
      title: validatedData.title,
      description: validatedData.description ?? null,
      status: validatedData.status,
      createdBy: adminId,
      questions: validatedData.questions.map((q) => ({
        ...q,
        helperText: q.helperText ?? null,
      })),
    });

    // Step 5: Handle service errors
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

    // Step 6: Return success response
    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error("[SurveysRoute] Unexpected error:", error);
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
