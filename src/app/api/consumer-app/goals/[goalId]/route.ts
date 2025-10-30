// API route handler for consumer app goals operations
// PATCH /api/consumer-app/goals/[goalId]
// DELETE /api/consumer-app/goals/[goalId]

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateApiKey } from "../../shared/auth";
import { errors } from "../../shared/errors";
import { makeGoalsService } from "../goals.service";
import { updateGoalSchema } from "@/lib/db/validation";

// UUID validation (lightweight, not worth centralizing)
const uuidSchema = z.string().uuid();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> },
) {
  try {
    // 1. Validate API key
    const isValid = await validateApiKey();
    if (!isValid) {
      return errors.unauthorized();
    }

    // 2. Await params and validate goalId from URL params
    const { goalId } = await params;
    const goalIdValidation = uuidSchema.safeParse(goalId);
    if (!goalIdValidation.success) {
      return errors.invalidRequest("Invalid goal ID format");
    }

    // 3. Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return errors.invalidRequest("Invalid JSON in request body");
    }

    const validation = updateGoalSchema.safeParse(body);
    if (!validation.success) {
      return errors.invalidRequest(
        "Invalid request body",
        validation.error.issues,
      );
    }

    // 4. Call service to update goal
    const service = makeGoalsService();
    const result = await service.updateGoal(
      goalIdValidation.data,
      validation.data,
    );

    // 5. Return appropriate response
    if (!result.success) {
      if (result.error === "Goal not found") {
        return errors.notFound("Goal");
      }
      if (
        result.error === "Invalid goal ID" ||
        result.error === "Invalid data"
      ) {
        return errors.invalidRequest(result.error);
      }
      return errors.internalError(result.error);
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error in goals PATCH API:", error);
    return errors.internalError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> },
) {
  try {
    // 1. Validate API key
    const isValid = await validateApiKey();
    if (!isValid) {
      return errors.unauthorized();
    }

    // 2. Await params and validate goalId from URL params
    const { goalId } = await params;
    const goalIdValidation = uuidSchema.safeParse(goalId);
    if (!goalIdValidation.success) {
      return errors.invalidRequest("Invalid goal ID format");
    }

    // 3. Call service to delete goal
    const service = makeGoalsService();
    const result = await service.deleteGoal(goalIdValidation.data);

    // 4. Return appropriate response
    if (!result.success) {
      if (result.error === "Goal not found") {
        return errors.notFound("Goal");
      }
      if (result.error === "Invalid goal ID") {
        return errors.invalidRequest(result.error);
      }
      return errors.internalError(result.error);
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error in goals DELETE API:", error);
    return errors.internalError();
  }
}
