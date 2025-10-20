import { NextRequest, NextResponse } from "next/server";
import {
  getUserProfileById,
  updateUserProfile,
} from "@/app/(dashboard)/subscribers/actions";
import { validateApiKey } from "../auth";

/**
 * GET /api/user-profiles/[id]
 * Get user profile by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Validate API key
  const authError = validateApiKey(request);
  if (authError) return authError;

  try {
    const result = await getUserProfileById(params.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("GET /api/user-profiles/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user-profiles/[id]
 * Update user profile
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Validate API key
  const authError = validateApiKey(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    const result = await updateUserProfile(params.id, body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Profile not found" ? 404 : 400 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("PATCH /api/user-profiles/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
