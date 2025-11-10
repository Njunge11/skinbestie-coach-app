import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../shared/auth";
import { errors } from "../shared/errors";
import { createJournalsService } from "./journals.service";
import { createJournalRequestSchema } from "./journals.types";
import { z } from "zod";

/**
 * GET /api/consumer-app/journals
 * List journal entries for a user with cursor-based pagination
 */
export async function GET(request: NextRequest) {
  // Step 1: Authenticate
  const isValidApiKey = await validateApiKey();
  if (!isValidApiKey) {
    return errors.unauthorized();
  }

  // Step 2: Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const cursor = searchParams.get("cursor") || undefined;
  const limitParam = searchParams.get("limit");

  // Step 3: Validate userId
  if (!userId) {
    return errors.invalidRequest("userId is required");
  }

  // Validate UUID format
  const uuidSchema = z.string().uuid();
  const uuidValidation = uuidSchema.safeParse(userId);
  if (!uuidValidation.success) {
    return errors.invalidRequest("userId must be a valid UUID");
  }

  // Step 4: Validate and parse limit
  const limit = limitParam ? parseInt(limitParam, 10) : 20;

  if (isNaN(limit) || limit < 1 || limit > 20) {
    return errors.invalidRequest("limit must be between 1 and 20");
  }

  // Step 5: Validate cursor if provided
  if (cursor) {
    try {
      // Try to decode base64
      const decoded = Buffer.from(cursor, "base64").toString();
      JSON.parse(decoded); // Verify it's valid JSON
    } catch {
      return errors.invalidRequest("Invalid cursor format");
    }
  }

  // Step 6: Look up userProfileId from userId
  const { db } = await import("@/lib/db");
  const { userProfiles } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");

  const [userProfile] = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (!userProfile) {
    return errors.notFound("User profile");
  }

  // Step 7: Call service layer
  try {
    const service = createJournalsService();
    const result = await service.listJournals({
      userProfileId: userProfile.id,
      cursor,
      limit,
    });

    if (!result.success) {
      return errors.internalError(result.error);
    }

    // Step 8: Return response
    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /journals:", error);
    return errors.internalError("An unexpected error occurred");
  }
}

/**
 * POST /api/consumer-app/journals
 * Create a new journal entry
 */
export async function POST(request: NextRequest) {
  console.error("[POST /journals] Received request");

  // Step 1: Authenticate
  const isValidApiKey = await validateApiKey();
  if (!isValidApiKey) {
    console.error("[POST /journals] Authentication failed");
    return errors.unauthorized();
  }
  console.error("[POST /journals] Authentication successful");

  // Step 2: Parse request body
  let body;
  try {
    body = await request.json();
    console.error("[POST /journals] Request body:", JSON.stringify(body));
  } catch (parseError) {
    console.error("[POST /journals] Failed to parse JSON:", parseError);
    return errors.invalidRequest("Invalid JSON in request body");
  }

  // Step 3: Validate request data
  const validation = createJournalRequestSchema.safeParse(body);
  if (!validation.success) {
    console.error("[POST /journals] Validation failed:");
    console.error(
      "[POST /journals] Validation errors:",
      validation.error.issues,
    );
    console.error("[POST /journals] Full validation error:", validation.error);
    return errors.invalidRequest("Validation failed", validation.error.issues);
  }
  console.error(
    "[POST /journals] Validation successful, validated data:",
    JSON.stringify({
      userId: validation.data.userId,
      title: validation.data.title,
      public: validation.data.public,
      hasContent: !!validation.data.content,
    }),
  );

  // Step 4: Call service layer
  try {
    const service = createJournalsService();
    console.error(
      "[POST /journals] Calling service.createJournal with userId:",
      validation.data.userId,
    );

    const result = await service.createJournal(
      validation.data.userId, // Frontend sends userId, we look up userProfileId
      validation.data,
    );

    if (!result.success) {
      console.error("[POST /journals] Service returned error:", result.error);
      // Return 404 if user profile not found
      if (result.error === "User profile not found") {
        return errors.notFound("User profile");
      }
      return errors.internalError(result.error);
    }

    console.error(
      "[POST /journals] Successfully created journal:",
      result.data.id,
    );
    // Step 5: Return response
    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error("[POST /journals] Unexpected error:", error);
    console.error(
      "[POST /journals] Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    return errors.internalError("An unexpected error occurred");
  }
}
