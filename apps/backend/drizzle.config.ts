import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",   // Path to your schema file
  out: "./drizzle",               // Where to save migration files
  dialect: "postgresql",          // The database type
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});