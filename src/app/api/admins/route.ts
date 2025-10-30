import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../auth";
import { makeAdminsRepo } from "./admins.repo";
import { createAdminSchema } from "@/lib/db/validation";

/**
 * POST /api/admins
 * Create a new admin user
 */
export async function POST(request: NextRequest) {
  // Validate API key
  const authError = validateApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();

    // Validate request body
    const parseResult = createAdminSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      const errorMessage = firstError?.message || "Invalid request data";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { email, name } = parseResult.data;

    // Create admin using repository
    const repo = makeAdminsRepo();
    const admin = await repo.create({
      email,
      name: name || null,
      passwordSet: false,
      role: "admin",
    });

    return NextResponse.json(admin, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/admins error:", error);

    // Check for unique constraint violation (duplicate email)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505" &&
      "constraint" in error &&
      error.constraint === "admins_email_unique"
    ) {
      return NextResponse.json(
        { error: "Admin with this email already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
