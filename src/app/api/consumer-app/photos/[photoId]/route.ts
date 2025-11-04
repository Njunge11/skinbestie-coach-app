import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateApiKey } from "../../shared/auth";
import { errors } from "../../shared/errors";
import { photoService } from "@/lib/services/photo.service";

// Validation schema for query parameters and path params
const getPhotoSchema = z.object({
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
  photoId: z.string().refine(
    (val) => {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(val);
    },
    { message: "Invalid photo ID" },
  ),
});

// Validation schema for PATCH request
const updatePhotoSchema = z
  .object({
    userProfileId: z.string({ message: "userProfileId is required" }).uuid(),
    photoId: z.string().refine(
      (val) => {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(val);
      },
      { message: "Invalid photo ID" },
    ),
    weekNumber: z.number().int().min(0).optional(),
    feedback: z.string().min(1).optional(),
  })
  .refine(
    (data) => data.weekNumber !== undefined || data.feedback !== undefined,
    { message: "At least one field (weekNumber or feedback) must be provided" },
  );

/**
 * GET /api/consumer-app/photos/[photoId]
 * Get a single photo by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> },
) {
  try {
    // 1. Authentication
    const isAuthenticated = await validateApiKey();
    if (!isAuthenticated) {
      return errors.unauthorized();
    }

    // 2. Parse and validate parameters
    const { photoId: photoIdParam } = await params;
    const { searchParams } = new URL(request.url);
    const requestParams = {
      userProfileId: searchParams.get("userProfileId"),
      photoId: photoIdParam,
    };

    const validation = getPhotoSchema.safeParse(requestParams);
    if (!validation.success) {
      return errors.invalidRequest(
        "Invalid request parameters",
        validation.error.issues,
      );
    }

    const { userProfileId, photoId } = validation.data;

    // 3. Get photo from service
    const result = await photoService.getPhotoById(photoId, userProfileId!);

    if (!result.success) {
      return errors.notFound(result.error);
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
    console.error("Error getting photo:", error);
    return errors.internalError("Failed to get photo");
  }
}

/**
 * PATCH /api/consumer-app/photos/[photoId]
 * Update a photo's metadata (weekNumber, feedback)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> },
) {
  try {
    // 1. Authentication
    const isAuthenticated = await validateApiKey();
    if (!isAuthenticated) {
      return errors.unauthorized();
    }

    // 2. Parse and validate request body
    const { photoId: photoIdParam } = await params;
    const body = await request.json();
    const requestData = {
      ...body,
      photoId: photoIdParam,
    };

    const validation = updatePhotoSchema.safeParse(requestData);
    if (!validation.success) {
      return errors.invalidRequest(
        "Invalid request body",
        validation.error.issues,
      );
    }

    const { userProfileId, photoId, weekNumber, feedback } = validation.data;

    // 3. Build update data
    const updateData: { weekNumber?: number; feedback?: string } = {};
    if (weekNumber !== undefined) {
      updateData.weekNumber = weekNumber;
    }
    if (feedback !== undefined) {
      updateData.feedback = feedback;
    }

    // 4. Update photo via service
    const result = await photoService.updatePhoto(
      photoId,
      userProfileId,
      updateData,
    );

    if (!result.success) {
      return errors.notFound(result.error);
    }

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        data: result.data,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating photo:", error);
    return errors.internalError("Failed to update photo");
  }
}

/**
 * DELETE /api/consumer-app/photos/[photoId]
 * Delete a photo
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> },
) {
  try {
    // 1. Authentication
    const isAuthenticated = await validateApiKey();
    if (!isAuthenticated) {
      return errors.unauthorized();
    }

    // 2. Parse and validate parameters
    const { photoId: photoIdParam } = await params;
    const { searchParams } = new URL(request.url);
    const requestParams = {
      userProfileId: searchParams.get("userProfileId"),
      photoId: photoIdParam,
    };

    const validation = getPhotoSchema.safeParse(requestParams);
    if (!validation.success) {
      return errors.invalidRequest(
        "Invalid request parameters",
        validation.error.issues,
      );
    }

    const { userProfileId, photoId } = validation.data;

    // 3. Delete photo via service
    const result = await photoService.deletePhoto(photoId, userProfileId!);

    if (!result.success) {
      return errors.notFound(result.error);
    }

    // 4. Return success response
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return errors.internalError("Failed to delete photo");
  }
}
