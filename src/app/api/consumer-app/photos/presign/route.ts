import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateApiKey } from "../../shared/auth";
import { errors } from "../../shared/errors";
import { storageService } from "@/lib/services/storage.service";

// Validation schema
const presignRequestSchema = z.object({
  userProfileId: z
    .string({ message: "userProfileId is required" })
    .uuid("Invalid user profile ID"),
  mime: z.enum(["image/jpeg", "image/png", "image/heic"], {
    message: "Unsupported file type. Allowed: JPEG, PNG, HEIC",
  }),
  extension: z.enum(["jpg", "jpeg", "png", "heic"], {
    message: "Invalid file extension",
  }),
  bytes: z
    .number({ message: "bytes is required" })
    .positive("File size must be positive")
    .max(10 * 1024 * 1024, "File too large. Maximum size: 10MB"),
});

// MIME type to extension mapping for validation
const mimeToExtensions: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/heic": ["heic"],
};

/**
 * POST /api/consumer-app/photos/presign
 * Generate presigned URL for photo upload
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

    const validation = presignRequestSchema.safeParse(body);
    if (!validation.success) {
      return errors.invalidRequest(
        "Invalid request body",
        validation.error.issues,
      );
    }

    const { userProfileId, mime, extension, bytes } = validation.data;

    // 3. Validate MIME type matches extension
    const allowedExtensions = mimeToExtensions[mime];
    if (!allowedExtensions || !allowedExtensions.includes(extension)) {
      return errors.invalidRequest(
        `MIME type ${mime} and extension ${extension} do not match`,
      );
    }

    // 4. Generate presigned URL
    const result = await storageService.generatePresignedUploadUrl({
      userProfileId,
      mime,
      extension,
      bytes,
    });

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          uploadUrl: result.uploadUrl,
          s3Key: result.s3Key,
          photoId: result.photoId,
          expiresIn: 60, // seconds
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return errors.internalError("Failed to generate presigned URL");
  }
}
