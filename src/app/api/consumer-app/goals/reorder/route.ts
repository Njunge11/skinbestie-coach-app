// API route handler for reordering consumer app goals
// POST /api/consumer-app/goals/reorder

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../../shared/auth";
import { errors } from "../../shared/errors";
import { makeGoalsService } from "../goals.service";
import { reorderGoalsSchema } from "@/lib/db/validation";

export async function POST(request: NextRequest) {
  try {
    // 1. Validate API key
    const isValid = await validateApiKey();
    if (!isValid) {
      return errors.unauthorized();
    }

    // 2. Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return errors.invalidRequest("Invalid JSON in request body");
    }

    const validation = reorderGoalsSchema.safeParse(body);
    if (!validation.success) {
      return errors.invalidRequest(
        "Invalid request body",
        validation.error.issues,
      );
    }

    // 3. Extract userId and goalIds
    const { userId, goalIds } = validation.data;

    // 4. Call service to reorder goals
    const service = makeGoalsService();
    const result = await service.reorderGoals(userId, goalIds);

    // 5. Return appropriate response
    if (!result.success) {
      if (
        result.error === "User not found" ||
        result.error === "Goals template not found"
      ) {
        return errors.notFound(result.error.replace(" not found", ""));
      }
      if (
        result.error === "Invalid user ID" ||
        result.error === "Invalid data" ||
        result.error === "Invalid goal IDs"
      ) {
        return errors.invalidRequest(result.error);
      }
      return errors.internalError(result.error);
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error in goals reorder API:", error);
    return errors.internalError();
  }
}
