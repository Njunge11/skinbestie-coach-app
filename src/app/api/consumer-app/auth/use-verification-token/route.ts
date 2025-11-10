import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../../shared/auth";
import { errors } from "../../shared/errors";
import { createAuthService } from "../auth.service";
import { useVerificationTokenRequestSchema } from "../auth.types";

/**
 * POST /api/consumer-app/auth/use-verification-token
 * Validate and consume a verification token (magic link) - one-time use
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
  const validation = useVerificationTokenRequestSchema.safeParse(body);
  if (!validation.success) {
    return errors.invalidRequest("Validation failed", validation.error.issues);
  }

  // Step 4: Call service layer
  try {
    const service = createAuthService();
    const result = await service.useVerificationToken(
      validation.data.identifier,
      validation.data.token,
    );

    if (!result.success) {
      // Token invalid, expired, or already used
      return errors.notFound("Verification token");
    }

    // Step 5: Return response
    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    console.error(
      "Unexpected error in POST /auth/use-verification-token:",
      error,
    );
    return errors.internalError("An unexpected error occurred");
  }
}
