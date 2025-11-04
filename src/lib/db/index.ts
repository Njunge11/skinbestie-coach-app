import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";

const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";
const url = process.env.DATABASE_URL;

if (!url && !isTest)
  throw new Error("DATABASE_URL environment variable is not set");

const isPooled =
  !!url?.includes(":6432/") || // PlanetScale PgBouncer
  !!url?.includes(":6543/"); // Supabase transaction pooler

// Type for database instance (for dependency injection)
// Accepts both production (PostgresJs) and test (Pglite) databases
export type DrizzleDB =
  | PostgresJsDatabase<typeof schema>
  | PgliteDatabase<typeof schema>;

export const client = url
  ? postgres(url, {
      prepare: isPooled ? false : true,
      max: isPooled ? 3 : 10,
      idle_timeout: isPooled ? 0 : 20,
      max_lifetime: 60 * 30,
      connect_timeout: 10,
    })
  : null;

export const db: DrizzleDB = client
  ? drizzle(client, { schema })
  : (null as unknown as DrizzleDB);
