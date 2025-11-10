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
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // Step 1: Authenticate
  const isValidApiKey = await validateApiKey();
  if (!isValidApiKey) {
    console.log(`[${timestamp}] [${requestId}] ❌ VERIFY_CODE: Unauthorized`);
    return errors.unauthorized();
  }

  // Step 2: Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    console.log(
      `[${timestamp}] [${requestId}] ❌ VERIFY_CODE: Invalid JSON in request body`,
    );
    return errors.invalidRequest("Invalid JSON in request body");
  }

  // Log incoming request (mask code for security)
  console.log(
    `[${timestamp}] [${requestId}] 📥 VERIFY_CODE Request:`,
    JSON.stringify({
      identifier: body.identifier,
      code: body.code ? "***" + body.code.slice(-2) : undefined, // Mask code, show last 2 digits
      ip: request.headers.get("x-forwarded-for") || "unknown",
    }),
  );

  // Step 3: Validate request data
  const validation = verifyCodeRequestSchema.safeParse(body);
  if (!validation.success) {
    console.log(
      `[${timestamp}] [${requestId}] ❌ VERIFY_CODE: Validation failed`,
      JSON.stringify(validation.error.issues),
    );
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
        console.log(
          `[${timestamp}] [${requestId}] ❌ VERIFY_CODE: Invalid or expired code for ${validation.data.identifier}`,
        );
        return errors.notFound("Verification code");
      }
      // Generic/unexpected error
      console.log(
        `[${timestamp}] [${requestId}] ❌ VERIFY_CODE: Service error - ${result.error}`,
      );
      return errors.internalError("An unexpected error occurred");
    }

    // Step 5: Return response
    console.log(
      `[${timestamp}] [${requestId}] ✅ VERIFY_CODE Response:`,
      JSON.stringify({
        identifier: result.data.identifier,
        verified: true,
      }),
    );
    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    console.error(
      `[${timestamp}] [${requestId}] 💥 VERIFY_CODE: Unexpected error`,
      error,
    );
    return errors.internalError("An unexpected error occurred");
  }
}
