import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (!process.env.DATABASE_URL) {
  console.error(
    "Define DATABASE_URL em .env.local (ignorado pelo Git) antes de migrar.",
  );
  process.exit(1);
}
const result = spawnSync(
  process.execPath,
  ["node_modules/drizzle-kit/bin.cjs", "migrate"],
  { stdio: "inherit", env: process.env },
);
process.exit(result.status ?? 1);
