import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import type { PGlite } from '@electric-sql/pglite';
import * as schema from './schema';

export async function applyMigrations(client: PGlite) {
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: './src/lib/db/migrations' });
}
