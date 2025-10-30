// Test database helper using PgLite for unit tests
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/lib/db/schema";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { applyMigrations } from "@/lib/db/migrate";

export type TestDatabase = PgliteDatabase<typeof schema>;

/**
 * Creates an in-memory test database with schema initialized
 * Perfect for unit tests that need a real database
 */
export async function createTestDatabase(): Promise<{
  db: TestDatabase;
  client: PGlite;
}> {
  // Create in-memory PgLite instance
  const client = new PGlite("memory://");

  // Create Drizzle instance with the schema
  const db = drizzle(client, { schema });

  // Apply migrations to ensure schema matches production
  await applyMigrations(client);

  return { db, client };
}

/**
 * Clone a database for test isolation
 */
export async function cloneTestDatabase(baseClient: PGlite): Promise<{
  db: TestDatabase;
  client: PGlite;
}> {
  const client = (await baseClient.clone()) as PGlite;
  const db = drizzle(client, { schema });
  return { db, client };
}

/**
 * Clean up test database
 */
export async function cleanupTestDatabase(client: PGlite): Promise<void> {
  await client.close();
}
