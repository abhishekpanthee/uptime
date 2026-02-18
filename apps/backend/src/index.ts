import { Elysia } from "elysia";
import { auth } from "./modules/auth";
import { cors } from "@elysiajs/cors";
import { websites } from "./modules/websites";
import { analyticsRoutes } from "./modules/analytics";
import { monitorService } from "./services/montior";
import { publicRoutes } from "./modules/public";

const app = new Elysia({ prefix: "/api" })
  .use(cors())
  .use(auth)
  .use(websites)
  .use(analyticsRoutes)
  .use(publicRoutes)
  .use(monitorService)
  .listen(8000);

console.log(`Uptime API running at ${app.server?.hostname}:${app.server?.port}`);