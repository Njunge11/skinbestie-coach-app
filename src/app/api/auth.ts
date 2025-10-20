import { NextRequest, NextResponse } from "next/server";

/**
 * Validates API key from request headers
 * Returns a 401 response if invalid, or null if valid
 */
export function validateApiKey(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get("x-api-key");
  const validApiKey = process.env.API_KEY;

  if (!apiKey || !validApiKey || apiKey !== validApiKey) {
    return NextResponse.json(
      { error: "Unauthorized - Invalid or missing API key" },
      { status: 401 }
    );
  }

  return null;
}
