import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../../shared/auth";
import { errors } from "../../shared/errors";
import { createJournalsService } from "../journals.service";
import { updateJournalRequestSchema } from "../journals.types";

/**
 * GET /api/consumer-app/journals/[id]
 * Get a journal entry by ID
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

  // Step 2: Get journal ID from params
  const { id } = await params;

  // Step 3: Get optional userId from query params
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId") || undefined;

  // Step 4: Call service layer
  try {
    const service = createJournalsService();
    const result = await service.getJournal(id, userId);

    if (!result.success) {
      // Handle specific error cases
      if (result.error === "Journal not found") {
        return errors.notFound("Journal");
      }
      if (result.error === "User profile not found") {
        return errors.notFound("User profile");
      }
      if (result.error === "Unauthorized to view this journal") {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "You do not have permission to view this journal",
            },
          },
          { status: 403 },
        );
      }
      return errors.internalError(result.error);
    }

    // Step 5: Return response
    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /journals/[id]:", error);
    return errors.internalError("An unexpected error occurred");
  }
}

/**
 * PATCH /api/consumer-app/journals/[id]
 * Update a journal entry
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Step 1: Authenticate
  const isValidApiKey = await validateApiKey();
  if (!isValidApiKey) {
    return errors.unauthorized();
  }

  // Step 2: Get journal ID from params
  const { id } = await params;

  // Step 3: Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return errors.invalidRequest("Invalid JSON in request body");
  }

  // Step 4: Validate request data
  const validation = updateJournalRequestSchema.safeParse(body);
  if (!validation.success) {
    return errors.invalidRequest("Validation failed", validation.error.issues);
  }

  // Step 5: Extract userId from validated data
  const userId = validation.data.userId;

  // Step 6: Call service layer
  try {
    const service = createJournalsService();
    const result = await service.updateJournal(id, userId, validation.data);

    if (!result.success) {
      // Handle specific error cases
      if (result.error === "Journal not found") {
        return errors.notFound("Journal");
      }
      if (result.error === "User profile not found") {
        return errors.notFound("User profile");
      }
      if (result.error === "Unauthorized to update journal") {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "You do not have permission to update this journal",
            },
          },
          { status: 403 },
        );
      }
      return errors.internalError(result.error);
    }

    // Step 7: Return response
    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in PATCH /journals/[id]:", error);
    return errors.internalError("An unexpected error occurred");
  }
}

/**
 * DELETE /api/consumer-app/journals/[id]
 * Delete a journal entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Step 1: Authenticate
  const isValidApiKey = await validateApiKey();
  if (!isValidApiKey) {
    return errors.unauthorized();
  }

  // Step 2: Get journal ID from params
  const { id } = await params;

  // Step 3: Parse request body
  let body;
  try {
    const text = await request.text();

    if (!text || text.trim() === "") {
      return errors.invalidRequest(
        "Request body is required with userId field",
      );
    }

    body = JSON.parse(text);
  } catch {
    return errors.invalidRequest("Invalid JSON in request body");
  }

  // Step 4: Extract userId from request
  const userId = body.userId;

  if (!userId) {
    return errors.invalidRequest("userId is required in request body");
  }

  // Step 5: Call service layer
  try {
    const service = createJournalsService();
    const result = await service.deleteJournal(id, userId);

    if (!result.success) {
      // Handle specific error cases
      if (result.error === "Journal not found") {
        return errors.notFound("Journal");
      }
      if (result.error === "User profile not found") {
        return errors.notFound("User profile");
      }
      if (result.error === "Unauthorized to delete journal") {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "You do not have permission to delete this journal",
            },
          },
          { status: 403 },
        );
      }
      return errors.internalError(result.error);
    }

    // Step 6: Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Journal deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Unexpected error in DELETE /journals/[id]:", error);
    return errors.internalError("An unexpected error occurred");
  }
}
