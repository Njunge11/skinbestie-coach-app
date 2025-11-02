// API route handler for completion endpoint
// PATCH /api/consumer-app/dashboard/routine-steps

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../../shared/auth";
import { makeCompletionService } from "./completion.service";
import { updateCompletionRequestSchema } from "./completion.types";

export async function PATCH(request: NextRequest) {
  console.log("[CompletionRoute] PATCH request received");

  try {
    // Step 1: Validate API key
    console.log("[CompletionRoute] Validating API key");
    const isValidKey = await validateApiKey();
    if (!isValidKey) {
      console.log("[CompletionRoute] Invalid or missing API key");
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
    console.log("[CompletionRoute] API key valid");

    // Step 2: Parse and validate request body
    const body = await request.json();
    console.log("[CompletionRoute] Request body:", body);

    const validation = updateCompletionRequestSchema.safeParse(body);

    if (!validation.success) {
      console.log("[CompletionRoute] Request validation failed:", {
        errors: validation.error.issues,
      });
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
    console.log("[CompletionRoute] Request validated:", validatedData);

    // Step 3: Call service to update completion
    console.log("[CompletionRoute] Calling service.updateCompletion");
    const service = makeCompletionService();
    const result = await service.updateCompletion({
      userId: validatedData.userId,
      stepId: validatedData.stepId,
      date: validatedData.date,
      completed: validatedData.completed,
    });

    // Step 4: Handle service errors
    if (!result.success) {
      console.log("[CompletionRoute] Service returned error:", result.error);

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
    console.log("[CompletionRoute] Success - returning data");
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
