// API route handler for consumer app profile updates
// PATCH /api/consumer-app/profile

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../shared/auth";
import { errors } from "../shared/errors";
import { patchProfileRequestSchema } from "./profile.types";
import { makeProfileService } from "./profile.service";

export async function PATCH(request: NextRequest) {
  try {
    // 1. Validate API key
    const isValid = await validateApiKey();
    if (!isValid) {
      return errors.unauthorized();
    }

    // 2. Parse and validate request body
    const body = await request.json();
    console.log(
      "📥 [PROFILE PATCH] Request body:",
      JSON.stringify(body, null, 2),
    );

    const validation = patchProfileRequestSchema.safeParse(body);

    if (!validation.success) {
      console.error(
        "Profile validation failed:",
        JSON.stringify(validation.error.issues, null, 2),
      );
      return errors.invalidRequest(
        "Invalid request body",
        validation.error.issues,
      );
    }

    // 3. Extract userId and updates
    const { userId, completedAt, ...updates } = validation.data;

    // Convert string dates to Date objects if present
    const profileUpdates = {
      ...updates,
      ...(completedAt ? { completedAt: new Date(completedAt) } : {}),
    };

    // 4. Call service to update profile
    const service = makeProfileService();
    const result = await service.updateProfile(userId, profileUpdates);

    // 5. Return appropriate response
    if (!result.success) {
      console.error("❌ [PROFILE PATCH] Update failed:", result.error);
      if (result.error === "User not found") {
        return errors.notFound("User");
      }
      return errors.internalError(result.error);
    }

    console.log(
      "✅ [PROFILE PATCH] Success response:",
      JSON.stringify({ success: true, data: result.data }, null, 2),
    );

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Error in profile PATCH API:", error);
    return errors.internalError();
  }
}
