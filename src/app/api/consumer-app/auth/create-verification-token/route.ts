import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../../shared/auth";
import { errors } from "../../shared/errors";
import { createAuthService } from "../auth.service";
import { createVerificationTokenRequestSchema } from "../auth.types";

/**
 * POST /api/consumer-app/auth/create-verification-token
 * Create a verification token (magic link) for passwordless authentication
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
  const validation = createVerificationTokenRequestSchema.safeParse(body);
  if (!validation.success) {
    return errors.invalidRequest("Validation failed", validation.error.issues);
  }

  // Step 4: Call service layer
  try {
    const service = createAuthService();
    const result = await service.createVerificationToken(
      validation.data.identifier,
    );

    if (!result.success) {
      // Handle specific error cases
      if (result.error === "Invalid email format") {
        return errors.invalidRequest(result.error);
      }
      return errors.internalError(result.error);
    }

    // Step 5: Return response with plain token
    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    console.error(
      "Unexpected error in POST /auth/create-verification-token:",
      error,
    );
    return errors.internalError("An unexpected error occurred");
  }
}
