/**
 * Simple PostgreSQL migration runner.
 * Reads SQL files from the migrations directory and executes them in order.
 * Tracks applied migrations in a `_migrations` table.
 *
 * Usage:  bun run scripts/migrate.ts
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const DATABASE_URL = Bun.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL environment variable");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  ssl:
    DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
      ? false
      : "require",
});

const MIGRATIONS_DIR = join(import.meta.dir, "../src/db/supabase/migrations");

async function ensureMigrationsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const rows = await sql`SELECT name FROM _migrations ORDER BY name`;
  return new Set(rows.map((r: any) => r.name));
}

async function runMigrations() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) continue;

    const content = await readFile(join(MIGRATIONS_DIR, file), "utf-8");
    console.log(`Applying migration: ${file}`);

    try {
      await sql.unsafe(content);
      await sql`INSERT INTO _migrations (name) VALUES (${file})`;
      ran++;
      console.log(`  OK`);
    } catch (err: any) {
      console.error(`  FAILED: ${err.message}`);
      process.exit(1);
    }
  }

  if (ran === 0) {
    console.log("All migrations already applied.");
  } else {
    console.log(`Applied ${ran} migration(s).`);
  }

  await sql.end();
}

runMigrations();
