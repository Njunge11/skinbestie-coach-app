// API route handler for consumer app dashboard
// GET /api/consumer-app/dashboard?userId=xxx

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../shared/auth";
import { errors } from "../shared/errors";
import { getDashboardRequestSchema } from "./dashboard.types";
import { makeDashboardService } from "./dashboard.service";

export async function GET(request: NextRequest) {
  try {
    // 1. Validate API key
    const isValid = await validateApiKey();
    if (!isValid) {
      return errors.unauthorized();
    }

    // 2. Validate request parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    const validation = getDashboardRequestSchema.safeParse({ userId });
    if (!validation.success) {
      return errors.invalidRequest(
        "Invalid request parameters",
        validation.error.issues,
      );
    }

    // 3. Call service to get dashboard data
    const service = makeDashboardService();
    const result = await service.getConsumerDashboard(validation.data.userId);

    // 4. Return appropriate response
    if (!result.success) {
      if (result.error === "User not found") {
        return errors.notFound("User");
      }
      return errors.internalError(result.error);
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Error in dashboard API:", error);
    return errors.internalError();
  }
}
