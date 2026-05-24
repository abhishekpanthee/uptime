import { Elysia } from "elysia";
import { supabase } from "../db";

export const healthRoutes = new Elysia()
  .get("/health", async ({ set }) => {
    const startTime = performance.now();
    let dbStatus = "ok";
    let dbLatency = 0;

    try {
      const dbStart = performance.now();
      const { error } = await supabase.from("users").select("id").limit(1);
      dbLatency = Math.round(performance.now() - dbStart);
      if (error) dbStatus = "error";
    } catch {
      dbStatus = "unreachable";
    }

    const healthy = dbStatus === "ok";
    if (!healthy) set.status = 503;

    return {
      status: healthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      version: process.env.npm_package_version || "1.0.0",
      checks: {
        database: {
          status: dbStatus,
          latency_ms: dbLatency,
        },
      },
      response_time_ms: Math.round(performance.now() - startTime),
    };
  });
