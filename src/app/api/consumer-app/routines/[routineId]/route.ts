import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateApiKey } from "../../shared/auth";
import { updateRoutine } from "@/app/(dashboard)/subscribers/[id]/routine-info-actions/actions";
import { verifyRoutineOwnership } from "../utils";

// Validation schema for update routine request
const updateRoutineRequestSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD")
    .nullable()
    .optional(),
  name: z.string().min(1, "Name cannot be empty").optional(),
});

/**
 * PATCH /api/consumer-app/routines/[routineId]
 * Update a routine (start date, end date, name)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ routineId: string }> },
) {
  try {
    // Step 0: Await params (Next.js 15 requirement)
    const { routineId } = await params;

    console.log(`📥 [ROUTINE PATCH] Request for routineId: ${routineId}`);

    // Step 1: Validate API key
    const isValid = await validateApiKey();
    if (!isValid) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or missing API key",
          },
        },
        { status: 401 },
      );
    }

    // Step 2: Parse and validate request body
    let body;
    try {
      body = await request.json();
      console.log(
        "📥 [ROUTINE PATCH] Request body:",
        JSON.stringify(body, null, 2),
      );
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "Invalid JSON in request body",
          },
        },
        { status: 400 },
      );
    }

    const validation = updateRoutineRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: validation.error.issues[0].message,
          },
        },
        { status: 400 },
      );
    }

    const { userId, startDate, endDate, name } = validation.data;

    // Step 3: Verify routine ownership
    const ownsRoutine = await verifyRoutineOwnership(routineId, userId);
    if (!ownsRoutine) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to update this routine",
          },
        },
        { status: 403 },
      );
    }

    // Step 4: Build update data (convert date strings to Date objects)
    const updates: {
      name?: string;
      startDate?: Date;
      endDate?: Date | null;
    } = {};

    if (name !== undefined) {
      updates.name = name;
    }

    if (startDate !== undefined) {
      updates.startDate = new Date(startDate + "T00:00:00Z");
    }

    if (endDate !== undefined) {
      updates.endDate = endDate ? new Date(endDate + "T00:00:00Z") : null;
    }

    // Step 5: Call updateRoutine service
    const result = await updateRoutine(routineId, updates);

    if (!result.success) {
      console.error("❌ [ROUTINE PATCH] Update failed:", result.error);
      return NextResponse.json(
        {
          error: {
            code: "UPDATE_FAILED",
            message: result.error,
          },
        },
        { status: 400 },
      );
    }

    // Step 6: Return success response
    const response = {
      success: true,
      data: result.data,
    };

    console.log(
      "✅ [ROUTINE PATCH] Success response:",
      JSON.stringify(response, null, 2),
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating routine:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update routine",
        },
      },
      { status: 500 },
    );
  }
}
