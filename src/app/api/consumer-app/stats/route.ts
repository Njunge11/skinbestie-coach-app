// API route handler for consumer stats endpoint
// GET /api/consumer-app/stats?userId={uuid}

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../shared/auth";
import { makeStatsService } from "./stats.service";
import { getStatsRequestSchema } from "./stats.types";

export async function GET(request: NextRequest) {
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

    // Step 2: Parse and validate request parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const validation = getStatsRequestSchema.safeParse({ userId });
    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "Invalid request parameters",
            details: validation.error.issues,
          },
        },
        { status: 400 },
      );
    }

    const validatedParams = validation.data;

    // Step 3: Call service to get stats
    const service = makeStatsService();
    const result = await service.getStats(validatedParams.userId);

    // Step 4: Handle service errors
    if (!result.success) {
      // Check for specific error types
      if (result.error === "User not found") {
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
    console.error("Unexpected error in stats route:", error);
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
