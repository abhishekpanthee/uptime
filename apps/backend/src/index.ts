import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { registerDbSchema } from "./db/schema_registery/initSchema";

//registering schemas 
await registerDbSchema();


const app = new Elysia()
  .use(cors())
  .get("/", () => ({
    message: "Welcome to the Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  }))
  .listen(3001);

console.log(
  `🦊 Backend server is running at ${app.server?.hostname}:${app.server?.port}`
);
