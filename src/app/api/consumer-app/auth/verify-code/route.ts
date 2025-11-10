import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../../shared/auth";
import { errors } from "../../shared/errors";
import { createAuthService } from "../auth.service";
import { verifyCodeRequestSchema } from "../auth.types";

/**
 * POST /api/consumer-app/auth/verify-code
 * Validate and consume a 6-digit verification code - one-time use
 */
export async function POST(request: NextRequest) {
  // Step 1: Authenticate
  const isValidApiKey = await validateApiKey();
  if (!isValidApiKey) {
    return errors.unauthorized();
  }

  // Step 2: Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return errors.invalidRequest("Invalid JSON in request body");
  }

  // Step 3: Validate request data
  const validation = verifyCodeRequestSchema.safeParse(body);
  if (!validation.success) {
    return errors.invalidRequest("Validation failed", validation.error.issues);
  }

  // Step 4: Call service layer
  try {
    const service = createAuthService();
    const result = await service.verifyCode(
      validation.data.identifier,
      validation.data.code,
    );

    if (!result.success) {
      // Check if it's a specific error or generic error
      if (result.error === "Invalid or expired code") {
        return errors.notFound("Verification code");
      }
      // Generic/unexpected error
      return errors.internalError("An unexpected error occurred");
    }

    // Step 5: Return response
    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in POST /auth/verify-code:", error);
    return errors.internalError("An unexpected error occurred");
  }
}
