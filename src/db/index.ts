import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;
// Direct SQL bypasses RLS for privileged roles. Never expose this client to callers.
export function getDatabase() {
  if (database) return database;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurado.");
  const client = postgres(url, { prepare: false, max: 5 });
  database = drizzle(client, { schema });
  return database;
}
