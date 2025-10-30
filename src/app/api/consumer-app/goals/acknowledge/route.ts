// API route handler for acknowledging consumer app goals
// PATCH /api/consumer-app/goals/acknowledge

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../../shared/auth";
import { errors } from "../../shared/errors";
import { makeGoalsService } from "../goals.service";
import { acknowledgeGoalsSchema } from "@/lib/db/validation";

export async function PATCH(request: NextRequest) {
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

    const validation = acknowledgeGoalsSchema.safeParse(body);
    if (!validation.success) {
      return errors.invalidRequest(
        "Invalid request body",
        validation.error.issues,
      );
    }

    // 3. Extract userId and acknowledgment status
    const { userId, goalsAcknowledgedByClient } = validation.data;

    // 4. Call service to acknowledge goals
    const service = makeGoalsService();
    const result = await service.acknowledgeGoals(
      userId,
      goalsAcknowledgedByClient,
    );

    // 5. Return appropriate response
    if (!result.success) {
      if (
        result.error === "User not found" ||
        result.error === "Goals template not found"
      ) {
        return errors.notFound(result.error.replace(" not found", ""));
      }
      if (result.error === "Invalid user ID") {
        return errors.invalidRequest(result.error);
      }
      return errors.internalError(result.error);
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error in goals acknowledge API:", error);
    return errors.internalError();
  }
}
