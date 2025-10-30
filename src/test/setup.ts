import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// Set up test environment variables before any imports
process.env.RESEND_API_KEY = "test-resend-api-key";
process.env.FROM_EMAIL = "test@example.com";
process.env.CALENDLY_TOKEN = "test-calendly-token";

// Mock next/server for Next Auth compatibility in tests
vi.mock("next/server", () => {
  // Create a proper Headers implementation
  class MockHeaders {
    private _headers: Record<string, string>;

    constructor(init?: Record<string, string> | HeadersInit) {
      this._headers = {};
      if (init) {
        Object.entries(init).forEach(([key, value]) => {
          this._headers[key.toLowerCase()] = String(value);
        });
      }
    }

    get(name: string): string | null {
      return this._headers[name.toLowerCase()] || null;
    }

    set(name: string, value: string): void {
      this._headers[name.toLowerCase()] = value;
    }

    has(name: string): boolean {
      return name.toLowerCase() in this._headers;
    }

    delete(name: string): void {
      delete this._headers[name.toLowerCase()];
    }

    forEach(
      callback: (value: string, key: string, parent: MockHeaders) => void,
    ): void {
      Object.entries(this._headers).forEach(([key, value]) => {
        callback(value, key, this);
      });
    }
  }

  return {
    NextRequest: class NextRequest {
      url: string;
      nextUrl: {
        searchParams: URLSearchParams;
        pathname: string;
        href: string;
      };
      headers: MockHeaders;
      method: string;
      private _body: unknown;

      constructor(
        url: string,
        init?: RequestInit & { headers?: Record<string, string> },
      ) {
        this.url = url;
        const urlObj = new URL(url);
        this.nextUrl = {
          searchParams: urlObj.searchParams,
          pathname: urlObj.pathname,
          href: url,
        };
        // Use the mock Headers class
        this.headers = new MockHeaders(init?.headers || {});
        this.method = init?.method || "GET";
        this._body = init?.body;
      }

      async json(): Promise<unknown> {
        if (typeof this._body === "string") {
          return JSON.parse(this._body);
        }
        return this._body;
      }

      async text(): Promise<string> {
        return this._body?.toString() || "";
      }
    },
    NextResponse: class NextResponse {
      static json(
        data: unknown,
        init?: ResponseInit & { headers?: Record<string, string> },
      ) {
        return {
          json: async () => data,
          status: init?.status || 200,
          headers: new MockHeaders(init?.headers || {}),
        };
      }
      static redirect(url: string, status: number = 302) {
        return {
          status,
          headers: new MockHeaders({ Location: url }),
        };
      }
    },
  };
});

// Mock next/headers for API route tests
vi.mock("next/headers", () => ({
  headers: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(() => null), // Default to no headers
    }),
  ),
}));

// Mock Next Auth to avoid import issues in tests
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(),
  })),
}));

// Mock our auth module
vi.mock("@/lib/auth", () => ({
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
  auth: vi.fn().mockResolvedValue(null),
}));

// Don't mock @/app/(dashboard)/actions globally - let individual tests handle it

// Polyfills for jsdom
if (typeof Element !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = function () {
      return false;
    };
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = function () {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = function () {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function () {};
  }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Store verification codes sent via email for testing
export const sentVerificationCodes = new Map<string, string>(); // email -> code

// Mock the resend email service to prevent actual emails from being sent
vi.mock("@/lib/email/resend", () => ({
  resend: {
    emails: {
      send: vi.fn().mockResolvedValue({ id: "test-email-id" }),
    },
  },
  FROM_EMAIL: "test@example.com",
}));

// Mock the sendVerificationCode function to capture codes
vi.mock("@/lib/email/send-verification-code", () => ({
  sendVerificationCode: vi
    .fn()
    .mockImplementation(async ({ to, code }: { to: string; code: string }) => {
      sentVerificationCodes.set(to, code);
      return { success: true };
    }),
}));

// Suppress console.error in tests to keep output clean
// Tests that specifically need to verify error logging can override this
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// Cleanup after each test
afterEach(async () => {
  // React Testing Library cleanup (for all tests)
  cleanup();

  // Restore all mocks including console.error
  vi.restoreAllMocks();

  // Clear captured verification codes
  sentVerificationCodes.clear();
});
