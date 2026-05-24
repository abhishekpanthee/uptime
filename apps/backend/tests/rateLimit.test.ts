import { describe, it, expect, afterAll } from "bun:test";
import { Elysia } from "elysia";
import { rateLimiter } from "../src/middleware/rateLimit";

const testPort = 19878;

describe("Rate Limiter Integration", () => {
  const app = new Elysia()
    .use(rateLimiter)
    .get("/test", () => ({ ok: true }))
    .get("/auth/login", () => ({ ok: true }))
    .listen(testPort);

  afterAll(() => { app.stop(); });

  it("should add rate limit headers to responses", async () => {
    const response = await fetch(`http://localhost:${testPort}/test`);

    expect(response.headers.get("X-RateLimit-Limit")).toBeTruthy();
    expect(response.headers.get("X-RateLimit-Remaining")).toBeTruthy();
    expect(response.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("should return 429 when rate limit is exceeded", async () => {
    // Auth endpoints have a limit of 5 per minute
    const responses: Response[] = [];

    for (let i = 0; i < 8; i++) {
      const res = await fetch(`http://localhost:${testPort}/auth/login`);
      responses.push(res);
    }

    // At least one response should be 429
    const has429 = responses.some((r) => r.status === 429);
    expect(has429).toBe(true);
  });
});
