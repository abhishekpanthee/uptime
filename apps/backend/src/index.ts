// import { Elysia } from "elysia";
// import { cors } from "@elysiajs/cors";
// import { runMigrations } from "./auto_migrate.js";

// //registering schemas 
// await runMigrations();


// const app = new Elysia()
//   .use(cors())
//   .get("/", () => ({
//     message: "Welcome to the Backend API",
//     version: "1.0.0",
//     timestamp: new Date().toISOString(),
//   }))
//   .listen(3001);

// console.log(
//   `🦊 Backend server is running at ${app.server?.hostname}:${app.server?.port}`
// );

import { Elysia } from "elysia";
import { auth } from "./modules/auth";
import { cors } from "@elysiajs/cors";
import { websites } from "./modules/websites";
import { analyticsRoutes } from "./modules/analytics";
import { monitorService } from "./services/montior";

const app = new Elysia({ prefix: "/api" })
  .use(cors())
  .use(auth)
  .use(websites)
  .use(analyticsRoutes)
  .use(monitorService) // Attaches the Cron Job
  .listen(8000);

console.log(`🦊 Uptime API running at ${app.server?.hostname}:${app.server?.port}`);