import { NextRequest, NextResponse } from "next/server";
import { getUserProfileByEmail } from "@/app/(dashboard)/subscribers/actions";

/**
 * GET /api/user-profiles/by-email?email=user@example.com
 * Get user profile by email
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    const result = await getUserProfileByEmail(email);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("GET /api/user-profiles/by-email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
