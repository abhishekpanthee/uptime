import { describe, it, expect } from "bun:test";
import { Elysia } from "elysia";
import { healthRoutes } from "../src/modules/health";

describe("Health Endpoint", () => {
  it("should return health status structure", async () => {
    // Create a minimal app with health routes for testing
    const app = new Elysia().use(healthRoutes);

    const response = await app.handle(new Request("http://localhost/health"));
    const body = await response.json();

    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("timestamp");
    expect(body).toHaveProperty("uptime");
    expect(body).toHaveProperty("checks");
    expect(body).toHaveProperty("response_time_ms");
    expect(typeof body.uptime).toBe("number");
    expect(typeof body.response_time_ms).toBe("number");
  });
});
