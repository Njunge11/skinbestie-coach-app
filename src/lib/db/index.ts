import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";
const url = process.env.DATABASE_URL;

if (!url && !isTest)
  throw new Error("DATABASE_URL environment variable is not set");

const isPooled =
  !!url?.includes(":6432/") || // PlanetScale PgBouncer
  !!url?.includes(":6543/"); // Supabase transaction pooler

export const client = url
  ? postgres(url, {
      prepare: isPooled ? false : true,
      max: isPooled ? 3 : 10,
      idle_timeout: isPooled ? 0 : 20,
      max_lifetime: 60 * 30,
      connect_timeout: 10,
    })
  : null;

export const db = client
  ? drizzle(client, { schema })
  : (null as unknown as ReturnType<typeof drizzle>);

export * from "./schema";
