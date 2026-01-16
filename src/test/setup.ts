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

// Mock react-remove-scroll to prevent slow DOM traversal in jsdom
// Radix UI Dialog uses this internally and it iterates through every DOM element
// when modal opens, causing massive slowdowns in tests
// See: https://github.com/radix-ui/primitives/issues/2356
vi.mock("react-remove-scroll", () => ({
  RemoveScroll: ({ children }: { children: React.ReactNode }) => children,
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

// PointerEvent polyfill for Radix UI components
// Radix UI uses onPointerDown which requires PointerEvent to exist in jsdom
// See: https://www.luisball.com/blog/using-radixui-with-react-testing-library
class MockPointerEvent extends MouseEvent {
  readonly pointerId: number;
  readonly width: number;
  readonly height: number;
  readonly pressure: number;
  readonly tangentialPressure: number;
  readonly tiltX: number;
  readonly tiltY: number;
  readonly twist: number;
  readonly pointerType: string;
  readonly isPrimary: boolean;

  constructor(type: string, params: PointerEventInit = {}) {
    super(type, params);
    this.pointerId = params.pointerId ?? 0;
    this.width = params.width ?? 1;
    this.height = params.height ?? 1;
    this.pressure = params.pressure ?? 0;
    this.tangentialPressure = params.tangentialPressure ?? 0;
    this.tiltX = params.tiltX ?? 0;
    this.tiltY = params.tiltY ?? 0;
    this.twist = params.twist ?? 0;
    this.pointerType = params.pointerType ?? "mouse";
    this.isPrimary = params.isPrimary ?? true;
  }

  getCoalescedEvents(): PointerEvent[] {
    return [];
  }

  getPredictedEvents(): PointerEvent[] {
    return [];
  }
}

global.PointerEvent = MockPointerEvent as unknown as typeof PointerEvent;

// Mock matchMedia for prefers-reduced-motion and other media queries
// This helps Radix UI and other libraries skip animations in tests
// See: https://vitest.dev/guide/mocking.html
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query === "(prefers-reduced-motion: reduce)",
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated but still used by some libraries
    removeListener: vi.fn(), // deprecated but still used by some libraries
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Inject CSS to disable animations and transitions in tests
// This ensures CSS animations complete instantly
// See: https://web.dev/articles/prefers-reduced-motion
const disableAnimationsStyle = document.createElement("style");
disableAnimationsStyle.innerHTML = `
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
`;
document.head.appendChild(disableAnimationsStyle);

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
