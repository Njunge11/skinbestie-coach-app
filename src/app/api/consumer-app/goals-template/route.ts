// API route handler for consumer app goals template updates
// PATCH /api/consumer-app/goals-template

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../shared/auth";
import { errors } from "../shared/errors";
import { patchGoalsTemplateRequestSchema } from "./goals-template.types";
import { makeGoalsTemplateService } from "./goals-template.service";

export async function PATCH(request: NextRequest) {
  try {
    // 1. Validate API key
    const isValid = await validateApiKey();
    if (!isValid) {
      return errors.unauthorized();
    }

    // 2. Parse and validate request body
    const body = await request.json();

    const validation = patchGoalsTemplateRequestSchema.safeParse(body);

    if (!validation.success) {
      console.error(
        "Goals template validation failed:",
        JSON.stringify(validation.error.issues, null, 2),
      );
      return errors.invalidRequest(
        "Invalid request body",
        validation.error.issues,
      );
    }

    // 3. Extract userId and updates
    const { userId, ...updates } = validation.data;

    // 4. Call service to update goals template
    const service = makeGoalsTemplateService();
    const result = await service.updateGoalsTemplate(userId, updates);

    // 5. Return appropriate response
    if (!result.success) {
      if (result.error === "User not found") {
        return errors.notFound("User");
      }
      if (result.error === "Goals template not found") {
        return errors.notFound("Goals template");
      }
      return errors.internalError(result.error);
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Error in goals-template PATCH API:", error);
    return errors.internalError();
  }
}
