// API key authentication for consumer app
import { headers } from "next/headers";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable is not set");
}

/**
 * Validates the API key from request headers
 * @returns true if API key is valid, false otherwise
 */
export async function validateApiKey(): Promise<boolean> {
  if (!API_KEY) {
    // In development, you might want to allow requests without API key
    if (process.env.NODE_ENV === "development") {
      console.warn("API key validation skipped in development mode");
      return true;
    }
    return false;
  }

  const headersList = await headers();
  const apiKey = headersList.get("x-api-key");

  if (!apiKey) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(apiKey, API_KEY);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
