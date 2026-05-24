import Redis from "ioredis";

const REDIS_URL = Bun.env.REDIS_URL || "redis://localhost:6379";
let redis: Redis | null = null;
let isConnected = false;

export function getRedis(): Redis | null {
  if (!redis) {
    try {
      redis = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 10) return null;
          return Math.min(times * 200, 5000);
        },
        lazyConnect: true,
      });

      redis.on("connect", () => {
        isConnected = true;
        console.log("[Redis] Connected");
      });

      redis.on("error", (err) => {
        console.error("[Redis] Error:", err.message);
        isConnected = false;
      });

      redis.on("close", () => {
        isConnected = false;
      });

      redis.connect().catch(() => {
        console.warn("[Redis] Initial connection failed, will retry");
      });
    } catch {
      console.warn("[Redis] Failed to create client, running without cache");
      return null;
    }
  }
  return redis;
}

export function isRedisConnected(): boolean {
  return isConnected;
}

// Cache helpers with graceful fallback
export async function cacheGet(key: string): Promise<string | null> {
  const r = getRedis();
  if (!r || !isConnected) return null;
  try {
    return await r.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const r = getRedis();
  if (!r || !isConnected) return;
  try {
    if (ttlSeconds) {
      await r.set(key, value, "EX", ttlSeconds);
    } else {
      await r.set(key, value);
    }
  } catch {
    // Silently fail - cache is optional
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const r = getRedis();
  if (!r || !isConnected) return;
  try {
    await r.del(key);
  } catch {
    // Silently fail
  }
}

export async function cacheClearPattern(pattern: string): Promise<void> {
  const r = getRedis();
  if (!r || !isConnected) return;
  try {
    const keys = await r.keys(pattern);
    if (keys.length > 0) {
      await r.del(...keys);
    }
  } catch {
    // Silently fail
  }
}

export async function publishEvent(channel: string, data: unknown): Promise<void> {
  const r = getRedis();
  if (!r || !isConnected) return;
  try {
    await r.publish(channel, JSON.stringify(data));
  } catch {
    // Silently fail
  }
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    isConnected = false;
  }
}
