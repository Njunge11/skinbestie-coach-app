import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../../shared/auth";
import { errors } from "../../shared/errors";
import { createAuthService } from "../auth.service";
import { createVerificationCodeRequestSchema } from "../auth.types";

/**
 * POST /api/consumer-app/auth/create-verification-code
 * Create a 6-digit verification code (magic code) - hashed and stored with 15 minute expiration
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
  const validation = createVerificationCodeRequestSchema.safeParse(body);
  if (!validation.success) {
    return errors.invalidRequest("Validation failed", validation.error.issues);
  }

  // Step 4: Call service layer
  try {
    const service = createAuthService();
    const result = await service.createVerificationCode(
      validation.data.identifier,
    );

    if (!result.success) {
      // Invalid email format
      return errors.invalidRequest(result.error);
    }

    // Step 5: Return response
    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    console.error(
      "Unexpected error in POST /auth/create-verification-code:",
      error,
    );
    return errors.internalError("An unexpected error occurred");
  }
}
