import { describe, it, expect, afterAll } from "bun:test";
import { Elysia } from "elysia";
import { securityHeaders, requestId } from "../src/middleware/security";

const testPort = 19876;

describe("Security Headers", () => {
  const app = new Elysia()
    .use(securityHeaders)
    .get("/test", () => ({ ok: true }))
    .listen(testPort);

  afterAll(() => { app.stop(); });

  it("should add security headers to responses", async () => {
    const response = await fetch(`http://localhost:${testPort}/test`);

    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Strict-Transport-Security")).toContain("max-age");
    expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });
});

describe("Request ID", () => {
  const app = new Elysia()
    .use(requestId)
    .get("/test", () => ({ ok: true }))
    .listen(testPort + 1);

  afterAll(() => { app.stop(); });

  it("should add X-Request-Id header to responses", async () => {
    const response = await fetch(`http://localhost:${testPort + 1}/test`);
    const id = response.headers.get("X-Request-Id");

    expect(id).toBeDefined();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("should generate unique IDs per request", async () => {
    const r1 = await fetch(`http://localhost:${testPort + 1}/test`);
    const r2 = await fetch(`http://localhost:${testPort + 1}/test`);

    expect(r1.headers.get("X-Request-Id")).not.toBe(r2.headers.get("X-Request-Id"));
  });
});
