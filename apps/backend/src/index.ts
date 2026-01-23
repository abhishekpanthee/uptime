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
  // .use(monitorService)
  .listen(8000);

console.log(`Uptime API running at ${app.server?.hostname}:${app.server?.port}`);