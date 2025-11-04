// API route handler for completion endpoint
// PATCH /api/consumer-app/dashboard/routine-steps

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../../shared/auth";
import { makeCompletionService } from "./completion.service";
import { updateCompletionRequestSchema } from "./completion.types";

export async function PATCH(request: NextRequest) {
  try {
    // Step 1: Validate API key
    const isValidKey = await validateApiKey();
    if (!isValidKey) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or missing API key",
          },
        },
        { status: 401 },
      );
    }

    // Step 2: Parse and validate request body
    const body = await request.json();

    const validation = updateCompletionRequestSchema.safeParse(body);

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

    // Step 3: Call service to update completion
    const service = makeCompletionService();
    const result = await service.updateCompletion({
      userId: validatedData.userId,
      stepId: validatedData.stepId,
      stepIds: validatedData.stepIds,
      date: validatedData.date,
      completed: validatedData.completed,
    });

    // Step 4: Handle service errors
    if (!result.success) {
      // Check for specific error types
      if (result.error === "Step not found or not authorized") {
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

      // Generic service error
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
    // Catch any unexpected errors
    console.error("[CompletionRoute] Unexpected error:", error);
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
