import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../../shared/auth";
import { errors } from "../../shared/errors";
import { createAuthService } from "../auth.service";
import { getUserByEmailRequestSchema } from "../auth.types";

/**
 * GET /api/consumer-app/auth/user-by-email?email=user@example.com
 * Find user by email and return with onboarding completion status
 */
export async function GET(request: NextRequest) {
  // Step 1: Authenticate
  const isValidApiKey = await validateApiKey();
  if (!isValidApiKey) {
    return errors.unauthorized();
  }

  // Step 2: Get email from query params
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  // Step 3: Validate request data
  const validation = getUserByEmailRequestSchema.safeParse({ email });
  if (!validation.success) {
    return errors.invalidRequest("Validation failed", validation.error.issues);
  }

  // Step 4: Call service layer
  try {
    const service = createAuthService();
    const result = await service.getUserByEmail(validation.data.email);

    if (!result.success) {
      // Handle specific error cases
      if (result.error === "User not found") {
        return errors.notFound("User");
      }
      return errors.internalError(result.error);
    }

    // Step 5: Return response
    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /auth/user-by-email:", error);
    return errors.internalError("An unexpected error occurred");
  }
}
