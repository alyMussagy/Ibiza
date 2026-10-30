import { readMigrationFiles } from "drizzle-orm/migrator";
import { mkdirSync, writeFileSync } from "node:fs";
// Fresh Supabase project ONLY. Matching journal allows future Drizzle migrations.
const migrations = readMigrationFiles({
  migrationsFolder: "src/db/migrations",
});
const prelude = `-- IBIZA: executar apenas num projecto Supabase NOVO e vazio.\n-- Todas as migrations e o journal são aplicados numa única transacção.\nBEGIN;\nCREATE SCHEMA IF NOT EXISTS drizzle;\nCREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations(id serial PRIMARY KEY,hash text NOT NULL,created_at bigint);\nDO $$ BEGIN IF EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations) THEN RAISE EXCEPTION 'Project already migrated: use npm run db:migrate'; END IF; END $$;\n`;
const body = migrations
  .map(
    (m) =>
      m.sql.join("\n") +
      `\nINSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES('${m.hash}',${m.folderMillis});\n`,
  )
  .join("\n");
mkdirSync("docs/setup", { recursive: true });
writeFileSync(
  "docs/setup/supabase-bootstrap.sql",
  prelude + body + "\nALTER TABLE drizzle.__drizzle_migrations ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON drizzle.__drizzle_migrations FROM anon, authenticated;\nCOMMIT;\n",
);
console.log("Bootstrap SQL gerado. Apenas para um projecto Supabase novo.");
