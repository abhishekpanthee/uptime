/**
 * In-memory cache replacing Redis.
 * Exports the same API so all importers work without changes.
 */

const cache = new Map<string, { value: string; expiresAt?: number }>();

export function getRedis(): null {
  return null;
}

export function isRedisConnected(): boolean {
  return false;
}

export async function cacheGet(key: string): Promise<string | null> {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  cache.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
  });
}

export async function cacheDelete(key: string): Promise<void> {
  cache.delete(key);
}

export async function cacheClearPattern(pattern: string): Promise<void> {
  const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
  for (const key of cache.keys()) {
    if (regex.test(key)) cache.delete(key);
  }
}

export async function publishEvent(_channel: string, _data: unknown): Promise<void> {
  // No-op without Redis pub/sub
}

export async function closeRedis(): Promise<void> {
  cache.clear();
}
