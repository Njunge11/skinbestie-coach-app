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
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // Step 1: Authenticate
  const isValidApiKey = await validateApiKey();
  if (!isValidApiKey) {
    console.log(`[${timestamp}] [${requestId}] ❌ CREATE_CODE: Unauthorized`);
    return errors.unauthorized();
  }

  // Step 2: Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    console.log(
      `[${timestamp}] [${requestId}] ❌ CREATE_CODE: Invalid JSON in request body`,
    );
    return errors.invalidRequest("Invalid JSON in request body");
  }

  // Log incoming request
  console.log(
    `[${timestamp}] [${requestId}] 📥 CREATE_CODE Request:`,
    JSON.stringify({
      identifier: body.identifier,
      ip: request.headers.get("x-forwarded-for") || "unknown",
    }),
  );

  // Step 3: Validate request data
  const validation = createVerificationCodeRequestSchema.safeParse(body);
  if (!validation.success) {
    console.log(
      `[${timestamp}] [${requestId}] ❌ CREATE_CODE: Validation failed`,
      JSON.stringify(validation.error.issues),
    );
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
      console.log(
        `[${timestamp}] [${requestId}] ❌ CREATE_CODE: Service error - ${result.error}`,
      );
      return errors.invalidRequest(result.error);
    }

    // Step 5: Return response
    console.log(
      `[${timestamp}] [${requestId}] ✅ CREATE_CODE Response:`,
      JSON.stringify({
        identifier: validation.data.identifier,
        message: result.data.message,
        expires: result.data.expires,
      }),
    );
    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    console.error(
      `[${timestamp}] [${requestId}] 💥 CREATE_CODE: Unexpected error`,
      error,
    );
    return errors.internalError("An unexpected error occurred");
  }
}
