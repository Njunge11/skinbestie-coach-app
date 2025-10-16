import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, afterAll, beforeAll, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';

import * as schema from '@/lib/db/schema';
import { applyMigrations } from '@/lib/db/migrate';

// Set up test environment variables before any imports
process.env.RESEND_API_KEY = 'test-resend-api-key';
process.env.FROM_EMAIL = 'test@example.com';
process.env.CALENDLY_TOKEN = 'test-calendly-token';

// Polyfills for jsdom
if (typeof Element !== 'undefined') {
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
vi.mock('@/lib/email/resend', () => ({
  resend: {
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'test-email-id' }),
    },
  },
  FROM_EMAIL: 'test@example.com',
}));

// Mock the sendVerificationCode function to capture codes
vi.mock('@/lib/email/send-verification-code', () => ({
  sendVerificationCode: vi.fn().mockImplementation(async ({ to, code }: { to: string; code: string }) => {
    sentVerificationCodes.set(to, code);
    return { success: true };
  }),
}));

// Mock the database module to use PGlite for integration tests
vi.mock('@/lib/db/index', async (importOriginal) => {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  return {
    ...(await importOriginal<typeof import('@/lib/db/index')>()),
    db,
    client,
  };
});

// Import the mocked db and client
const { db, client } = await import('@/lib/db/index');

// Apply migrations ONCE before all tests (not before each test)
beforeAll(async () => {
  await applyMigrations(client as PGlite);
});

// Cleanup after each test
afterEach(async () => {
  // React Testing Library cleanup (for all tests)
  cleanup();

  // Database cleanup: clear data, keep schema (much faster than dropping/recreating)
  await db.execute(sql`TRUNCATE TABLE admins, verification_codes, user_profiles RESTART IDENTITY CASCADE`);

  // Clear captured verification codes
  sentVerificationCodes.clear();
});

// Free up resources after all tests are done
afterAll(async () => {
  if (client && typeof (client as PGlite).close === 'function') {
    await (client as PGlite).close();
  }
});
