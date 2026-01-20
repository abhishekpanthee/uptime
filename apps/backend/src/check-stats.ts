import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { analytics } from './db/schema';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function check() {
  const data = await db.select().from(analytics);
  console.log("📊 Ping Results:", data);
  process.exit(0);
}

check();