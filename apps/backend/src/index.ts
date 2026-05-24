import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";

// Database
import { closePgPool } from "./db";

// Middleware
import { rateLimiter } from "./middleware/rateLimit";
import { securityHeaders, requestId } from "./middleware/security";

// Modules - Month 1
import { auth } from "./modules/auth";
import { websites } from "./modules/websites";
import { analyticsRoutes } from "./modules/analytics";
import { publicRoutes } from "./modules/public";
import { healthRoutes } from "./modules/health";

// Modules - Month 3
import { monitorGroups } from "./modules/monitorGroups";

// Modules - Month 4-5
import { incidents } from "./modules/incidents";
import { notifications } from "./modules/notifications";
import { registerAlertHandlers } from "./modules/notifications";

// Modules - Month 6
import { maintenance } from "./modules/maintenance";
import { startMaintenanceScheduler } from "./modules/maintenance";
import { sla } from "./modules/sla";
import { startSLAScheduler } from "./modules/sla";

// Modules - Month 7
import { organizations } from "./modules/organizations";

// Modules - Month 8
import { statusPages, publicStatusPages } from "./modules/statusPages";

// Modules - Month 9
import { apiKeys } from "./modules/apiKeys";
import { webhookRoutes, registerWebhookHandlers } from "./modules/webhookRoutes";
import { apiV1 } from "./modules/apiV1";

// Services - Month 1
import { aggregationService } from "./services/aggregation";

// Services - Month 2
import { startMonitorEngine, stopMonitorEngine } from "./services/monitorEngine";
import { websocketService, broadcastEvent } from "./services/websocket";
import { startQueueProcessor } from "./services/queue";
import { closeRedis } from "./services/redis";

// Services - Month 11
import { startAnomalyDetection, stopAnomalyDetection } from "./services/anomaly";

const allowedOrigins = (Bun.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

const port = Number(Bun.env.PORT) || 8000;

const app = new Elysia()
  // Global middleware
  .use(requestId)
  .use(securityHeaders)
  .use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  )
  .use(rateLimiter)
  // Body size limit
  .onParse(({ request, set }) => {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 1_048_576) {
      // 1MB
      set.status = 413;
      throw new Error("Request body too large");
    }
  })
  // Health check (no /api prefix)
  .use(healthRoutes)
  // WebSocket (no /api prefix)
  .use(websocketService)
  // Public status pages (no /api prefix, at /s/:slug)
  .use(publicStatusPages)
  // API v1 (at /api/v1)
  .group("/api", (app) =>
    app
      // Month 1 - Core
      .use(auth)
      .use(websites)
      .use(analyticsRoutes)
      .use(publicRoutes)
      .use(aggregationService)
      // Month 3 - Groups
      .use(monitorGroups)
      // Month 4-5 - Incidents & Notifications
      .use(incidents)
      .use(notifications)
      // Month 6 - Maintenance & SLA
      .use(maintenance)
      .use(sla)
      // Month 7 - Organizations
      .use(organizations)
      // Month 8 - Status Pages
      .use(statusPages)
      // Month 9 - API Keys & Webhooks
      .use(apiKeys)
      .use(webhookRoutes)
      .use(apiV1)
  )
  .listen(port);

console.log(`Uptime API running at ${app.server?.hostname}:${port}`);

// -- Initialize background services --

// Register job handlers
registerAlertHandlers();
registerWebhookHandlers();

// Start queue processor
startQueueProcessor();

// Start enhanced monitor engine (replaces old monitorService)
startMonitorEngine();

// Start schedulers
startMaintenanceScheduler();
startSLAScheduler();

// Start anomaly detection
startAnomalyDetection();

console.log("[Init] All services started");

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  stopMonitorEngine();
  stopAnomalyDetection();
  await closeRedis();
  await closePgPool();
  app.stop();
  console.log("Server stopped. Exiting.");
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));