import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, afterAll, beforeAll, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';

import * as schema from '@/lib/db/schema';
import { applyMigrations } from '@/lib/db/migrate';

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
  await db.execute(sql`TRUNCATE TABLE admins, verification_codes RESTART IDENTITY CASCADE`);
});

// Free up resources after all tests are done
afterAll(async () => {
  if (client && typeof (client as PGlite).close === 'function') {
    await (client as PGlite).close();
  }
});
