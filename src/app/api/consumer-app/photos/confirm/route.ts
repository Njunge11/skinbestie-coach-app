import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateApiKey } from "../../shared/auth";
import { errors } from "../../shared/errors";
import { photoService } from "@/lib/services/photo.service";

// Validation schema
const confirmPhotoSchema = z.object({
  userProfileId: z
    .string({ message: "userProfileId is required" })
    .uuid("Invalid user profile ID"),
  s3Key: z
    .string({ message: "s3Key is required" })
    .min(1, "s3Key cannot be empty"),
  s3Bucket: z
    .string({ message: "s3Bucket is required" })
    .min(1, "s3Bucket cannot be empty"),
  bytes: z
    .number({ message: "bytes is required" })
    .positive("bytes must be positive"),
  mime: z
    .string({ message: "mime is required" })
    .min(1, "mime cannot be empty"),
  imageUrl: z
    .string({ message: "imageUrl is required" })
    .url("Invalid imageUrl"),
  weekNumber: z.number().optional(),
  originalName: z.string().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

/**
 * POST /api/consumer-app/photos/confirm
 * Confirm photo upload and create database record
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const isAuthenticated = await validateApiKey();
    if (!isAuthenticated) {
      return errors.unauthorized();
    }

    // 2. Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errors.invalidRequest("Invalid JSON in request body");
    }

    const validation = confirmPhotoSchema.safeParse(body);
    if (!validation.success) {
      return errors.invalidRequest(
        "Invalid request body",
        validation.error.issues,
      );
    }

    const {
      userProfileId,
      s3Key,
      s3Bucket,
      bytes,
      mime,
      imageUrl,
      weekNumber,
      originalName,
      width,
      height,
    } = validation.data;

    // 3. Create photo record in database
    const result = await photoService.createPhoto({
      userProfileId,
      s3Key,
      s3Bucket,
      bytes,
      mime,
      imageUrl,
      weekNumber,
      originalName,
      width,
      height,
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
      { status: 201 },
    );
  } catch (error) {
    console.error("Error confirming photo upload:", error);
    return errors.internalError("Failed to confirm photo upload");
  }
}
