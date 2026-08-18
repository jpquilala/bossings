import "server-only";
import { createRequire } from "node:module";
import type Redis from "ioredis";
import { serverEnv } from "./env";

/**
 * Small cache facade. Uses Redis when REDIS_URL is set, otherwise an
 * in-process Map with the same semantics so the app runs unchanged locally.
 */

type Entry = { value: string; expiresAt: number };

const memory = new Map<string, Entry>();

const globalForRedis = globalThis as unknown as { redis?: Redis | null };

function getRedis(): Redis | null {
  if (!serverEnv.redisUrl) return null;
  if (globalForRedis.redis !== undefined) return globalForRedis.redis;

  try {
    // Loaded lazily so the dependency is never touched without a URL.
    // createRequire keeps this synchronous — getRedis() is called from
    // synchronous paths and must not become a promise.
    const requireModule = createRequire(import.meta.url);
    const { default: RedisCtor } = requireModule("ioredis") as typeof import("ioredis");
    const client = new RedisCtor(serverEnv.redisUrl, {
      maxRetriesPerRequest: 2,
      lazyConnect: false,
      enableOfflineQueue: false,
    });
    // A dead Redis must never take the site down — degrade to memory instead.
    client.on("error", (err: Error) => {
      console.warn("[cache] redis error, falling back to memory:", err.message);
    });
    globalForRedis.redis = client;
    return client;
  } catch (err) {
    console.warn("[cache] redis unavailable, using memory:", err);
    globalForRedis.redis = null;
    return null;
  }
}

function memoryGet(key: string): string | null {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}

export async function cacheGet(key: string): Promise<string | null> {
  const redis = getRedis();
  if (redis) {
    try {
      return await redis.get(key);
    } catch {
      return memoryGet(key);
    }
  }
  return memoryGet(key);
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(key, value, "EX", ttlSeconds);
      return;
    } catch {
      // fall through to memory
    }
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheDel(prefix: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length) await redis.del(...keys);
    } catch {
      // fall through
    }
  }
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
}

/** Read-through cache around an async producer. */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  produce: () => Promise<T>,
): Promise<T> {
  const hit = await cacheGet(key);
  if (hit) {
    try {
      return JSON.parse(hit) as T;
    } catch {
      // Corrupt entry — fall through and recompute.
    }
  }
  const fresh = await produce();
  await cacheSet(key, JSON.stringify(fresh), ttlSeconds);
  return fresh;
}

/**
 * Fixed-window rate limit. Returns whether the caller is allowed plus how
 * many requests remain in the current window.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis();
  const bucket = `rl:${key}`;

  if (redis) {
    try {
      const count = await redis.incr(bucket);
      if (count === 1) await redis.expire(bucket, windowSeconds);
      return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
    } catch {
      // fall through to memory
    }
  }

  const now = Date.now();
  const hit = memory.get(bucket);
  if (!hit || hit.expiresAt < now) {
    memory.set(bucket, { value: "1", expiresAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1 };
  }
  const count = Number(hit.value) + 1;
  hit.value = String(count);
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}
