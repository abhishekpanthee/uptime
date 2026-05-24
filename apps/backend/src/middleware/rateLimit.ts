import { Elysia } from "elysia";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

// Clean up expired buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) {
      buckets.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  auth: { windowMs: 60_000, max: 5 },
  api: { windowMs: 60_000, max: 60 },
  public: { windowMs: 60_000, max: 120 },
};

function getCategory(path: string): string {
  if (path.includes("/auth/")) return "auth";
  if (path.includes("/public/")) return "public";
  return "api";
}

export const rateLimiter = new Elysia({ name: "rate-limiter" }).onBeforeHandle(
  { as: "global" },
  ({ request, set }) => {
    const url = new URL(request.url);
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const category = getCategory(url.pathname);
    const config = RATE_LIMITS[category];
    const key = `${ip}:${category}`;
    const now = Date.now();

    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
      bucket = { count: 0, resetAt: now + config.windowMs };
      buckets.set(key, bucket);
    }

    bucket.count++;

    const remaining = Math.max(0, config.max - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);

    set.headers["X-RateLimit-Limit"] = String(config.max);
    set.headers["X-RateLimit-Remaining"] = String(remaining);
    set.headers["X-RateLimit-Reset"] = String(resetSeconds);

    if (bucket.count > config.max) {
      set.status = 429;
      set.headers["Retry-After"] = String(resetSeconds);
      return { error: "Too many requests. Please try again later." };
    }
  }
);
