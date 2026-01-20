import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function reset() {
  console.log("💥 Dropping all tables...");
  // This deletes the 'public' schema and recreates it, wiping all data/tables
  await client`DROP SCHEMA public CASCADE`;
  await client`CREATE SCHEMA public`;
  await client`GRANT ALL ON SCHEMA public TO public`;
  console.log("✅ Database reset complete.");
  process.exit(0);
}

reset();