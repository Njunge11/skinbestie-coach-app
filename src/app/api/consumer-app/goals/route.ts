// API route handler for consumer app goals
// POST /api/consumer-app/goals

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../shared/auth";
import { errors } from "../shared/errors";
import { makeGoalsService } from "./goals.service";
import { createGoalSchema } from "@/lib/db/validation";

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

    const validation = createGoalSchema.safeParse(body);
    if (!validation.success) {
      return errors.invalidRequest(
        "Invalid request body",
        validation.error.issues,
      );
    }

    // 3. Extract userId and goal data
    const { userId, description, isPrimaryGoal } = validation.data;

    // 4. Call service to create goal
    const service = makeGoalsService();
    const result = await service.createGoal(userId, {
      description,
      isPrimaryGoal,
    });

    // 5. Return appropriate response
    if (!result.success) {
      if (result.error === "User not found") {
        return errors.notFound("User");
      }
      if (result.error === "Goals template not found") {
        return errors.notFound("Goals template");
      }
      if (
        result.error === "Invalid user ID" ||
        result.error === "Invalid data"
      ) {
        return errors.invalidRequest(result.error);
      }
      return errors.internalError(result.error);
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in goals POST API:", error);
    return errors.internalError();
  }
}
