import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateApiKey } from "../shared/auth";
import { errors } from "../shared/errors";
import { photoService } from "@/lib/services/photo.service";

// Validation schema for query parameters
const listPhotosSchema = z
  .object({
    userProfileId: z
      .string()
      .nullable()
      .refine((val) => val !== null, { message: "userProfileId is required" })
      .refine(
        (val) => {
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return uuidRegex.test(val!);
        },
        { message: "Invalid user profile ID" },
      ),
    limit: z
      .string()
      .nullable()
      .transform((val) => (val ? parseInt(val, 10) : 20)),
    offset: z
      .string()
      .nullable()
      .transform((val) => (val ? parseInt(val, 10) : 0)),
    weekNumber: z
      .string()
      .nullable()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
  })
  .refine(
    (data) => {
      if (data.limit !== undefined && (isNaN(data.limit) || data.limit <= 0)) {
        return false;
      }
      if (
        data.offset !== undefined &&
        (isNaN(data.offset) || data.offset < 0)
      ) {
        return false;
      }
      if (data.weekNumber !== undefined && isNaN(data.weekNumber)) {
        return false;
      }
      return true;
    },
    { message: "Invalid query parameters" },
  );

/**
 * GET /api/consumer-app/photos
 * List photos for a user with pagination and optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const isAuthenticated = await validateApiKey();
    if (!isAuthenticated) {
      return errors.unauthorized();
    }

    // 2. Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const params = {
      userProfileId: searchParams.get("userProfileId"),
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
      weekNumber: searchParams.get("weekNumber"),
    };

    const validation = listPhotosSchema.safeParse(params);
    if (!validation.success) {
      return errors.invalidRequest(
        "Invalid request parameters",
        validation.error.issues,
      );
    }

    const { userProfileId, limit, offset, weekNumber } = validation.data;

    // 3. List photos from service
    const result = await photoService.listPhotos({
      userProfileId: userProfileId!,
      limit,
      offset,
      weekNumber,
    });

    if (!result.success) {
      return errors.internalError(result.error);
    }

    // 4. Return success response
    return NextResponse.json(
      {
        success: true,
        data: result.data,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error listing photos:", error);
    return errors.internalError("Failed to list photos");
  }
}
