import { NextRequest, NextResponse } from "next/server";
import { createUserProfile } from "@/app/(dashboard)/subscribers/actions";
import { validateApiKey } from "../auth";

/**
 * POST /api/user-profiles
 * Create a new user profile
 */
export async function POST(request: NextRequest) {
  // Validate API key
  const authError = validateApiKey(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    const result = await createUserProfile(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.includes("already registered") ? 409 : 400 }
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error("POST /api/user-profiles error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
