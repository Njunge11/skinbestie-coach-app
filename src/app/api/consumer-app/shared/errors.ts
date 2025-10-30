// Standardized error responses for consumer API
import { NextResponse } from "next/server";

export type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status },
  );
}

// Common error responses
export const errors = {
  unauthorized: () =>
    createErrorResponse("UNAUTHORIZED", "Invalid or missing API key", 401),

  notFound: (resource: string) =>
    createErrorResponse("NOT_FOUND", `${resource} not found`, 404),

  invalidRequest: (message: string, details?: unknown) =>
    createErrorResponse("INVALID_REQUEST", message, 400, details),

  internalError: (message = "An internal error occurred") =>
    createErrorResponse("INTERNAL_ERROR", message, 500),
} as const;
