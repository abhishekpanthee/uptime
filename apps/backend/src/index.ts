import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import sql, { testConnection } from "./db";

// Test database connection on startup
testConnection();

const app = new Elysia()
  .use(cors())
  .get("/", () => ({
    message: "Welcome to the Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  }))
  .get("/api/health", async () => {
    let dbStatus = "disconnected";
    try {
      await sql`SELECT 1`;
      dbStatus = "connected";
    } catch (error) {
      console.error("DB health check failed:", error);
    }
    return {
      status: "ok",
      uptime: process.uptime(),
      database: dbStatus,
    };
  })

  .get("/api/db/example", async () => {
    try {
      const result = await sql`SELECT NOW() as server_time`;
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  })
  .get("/api/hello/:name", ({ params: { name } }) => ({
    message: `Hello, ${name}!`,
  }))
  .post("/api/data", ({ body }) => ({
    received: body,
    timestamp: new Date().toISOString(),
  }))
  .listen(3001);

console.log(
  `🦊 Backend server is running at ${app.server?.hostname}:${app.server?.port}`
);
