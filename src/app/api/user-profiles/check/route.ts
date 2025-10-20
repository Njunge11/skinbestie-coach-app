import { NextRequest, NextResponse } from "next/server";
import { checkUserProfileExists } from "@/app/(dashboard)/subscribers/actions";
import { validateApiKey } from "../auth";

/**
 * GET /api/user-profiles/check?email=user@example.com&phoneNumber=+1234567890
 * Check if user profile exists by email or phone number
 */
export async function GET(request: NextRequest) {
  // Validate API key
  const authError = validateApiKey(request);
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");
    const phoneNumber = searchParams.get("phoneNumber");

    if (!email && !phoneNumber) {
      return NextResponse.json(
        { error: "Either email or phoneNumber parameter is required" },
        { status: 400 }
      );
    }

    const result = await checkUserProfileExists({
      email: email || undefined,
      phoneNumber: phoneNumber || undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("GET /api/user-profiles/check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
