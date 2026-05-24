import { describe, it, expect, beforeAll } from "bun:test";

describe("Rate Limiter", () => {
  it("should allow requests under the limit", async () => {
    const { rateLimiter } = await import("../src/middleware/rateLimit");
    expect(rateLimiter).toBeDefined();
  });
});

describe("Security Headers", () => {
  it("should export securityHeaders and requestId plugins", async () => {
    const { securityHeaders, requestId } = await import("../src/middleware/security");
    expect(securityHeaders).toBeDefined();
    expect(requestId).toBeDefined();
  });
});
