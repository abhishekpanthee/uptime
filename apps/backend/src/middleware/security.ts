import { Elysia } from "elysia";
import crypto from "crypto";

export const securityHeaders = new Elysia({ name: "security-headers" })
  .onBeforeHandle({ as: "global" }, ({ set }) => {
    set.headers["X-Content-Type-Options"] = "nosniff";
    set.headers["X-Frame-Options"] = "DENY";
    set.headers["X-XSS-Protection"] = "0";
    set.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
    set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    set.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
  });

export const requestId = new Elysia({ name: "request-id" })
  .onBeforeHandle({ as: "global" }, ({ set }) => {
    const id = crypto.randomUUID();
    set.headers["X-Request-Id"] = id;
  });
