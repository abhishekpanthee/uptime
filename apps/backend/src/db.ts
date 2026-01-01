import postgres from "postgres";

// Database connection
const sql = postgres({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "mydb",
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: 10,
});

// Test connection helper
export async function testConnection() {
  try {
    const result = await sql`SELECT NOW() as current_time, version()`;
    console.log("✅ Database connected:", result[0].current_time);
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}


export default sql;
