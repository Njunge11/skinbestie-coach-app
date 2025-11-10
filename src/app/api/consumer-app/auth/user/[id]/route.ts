import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../../../shared/auth";
import { errors } from "../../../shared/errors";
import { createAuthService } from "../../auth.service";

/**
 * GET /api/consumer-app/auth/user/[id]
 * Get user by ID with profile and onboarding status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Step 1: Authenticate
  const isValidApiKey = await validateApiKey();
  if (!isValidApiKey) {
    return errors.unauthorized();
  }

  // Step 2: Get user ID from params
  const { id } = await params;

  // Step 3: Call service layer
  try {
    const service = createAuthService();
    const result = await service.getUserById(id);

    if (!result.success) {
      // Check error type
      if (result.error === "Invalid user ID format") {
        return errors.invalidRequest(result.error);
      }
      if (result.error === "User not found") {
        return errors.notFound("User");
      }
      // Generic error
      return errors.internalError("An unexpected error occurred");
    }

    // Step 4: Return response
    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /auth/user/[id]:", error);
    return errors.internalError("An unexpected error occurred");
  }
}
