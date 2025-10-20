import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Allow db to be undefined during tests (integration tests use PGlite)
const isTest = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';

if (!process.env.DATABASE_URL && !isTest) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Disable prefetch as it's not supported for "Transaction" pool mode
export const client = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, { prepare: false })
  : null;

export const db = client ? drizzle(client, { schema }) : (null as unknown as ReturnType<typeof drizzle>);

export * from './schema';
