import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Allow db to be undefined during tests (integration tests use PGlite)
const isTest = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';

if (!process.env.DATABASE_URL && !isTest) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Detect if using transaction mode (port 6543) - required for serverless (Vercel)
const isTransactionMode = process.env.DATABASE_URL?.includes(':6543');

// Connection pooling configuration for postgres-js
export const client = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, {
      prepare: isTransactionMode ? false : true, // Transaction mode doesn't support prepared statements
      max: isTransactionMode ? 1 : 10, // Serverless needs fewer connections
      idle_timeout: isTransactionMode ? 0 : 20,
      max_lifetime: 60 * 30, // Close connections after 30 minutes
      connect_timeout: 10, // Connection timeout in seconds (default: 30)
      // Query monitoring: log slow queries (>100ms)
      debug: (connection, query) => {
        const start = Date.now();
        return () => {
          const duration = Date.now() - start;
          if (duration > 100) {
            console.warn(`[SLOW QUERY - ${duration}ms]`, {
              query: query.substring(0, 200), // Truncate long queries
              duration: `${duration}ms`,
              connection,
            });
          }
        };
      },
    })
  : null;

export const db = client ? drizzle(client, { schema }) : (null as unknown as ReturnType<typeof drizzle>);

export * from './schema';
