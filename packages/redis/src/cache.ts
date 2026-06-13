import { getClient } from "./client";

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getClient();
  const data = await client.get(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  const client = getClient();
  const data = JSON.stringify(value);
  await client.setex(key, ttlSeconds, data);
}

export async function cacheDelete(key: string): Promise<void> {
  const client = getClient();
  await client.del(key);
}

const pendingPromises = new Map<string, Promise<any>>();

export async function getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds = 300): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  let promise = pendingPromises.get(key);
  if (!promise) {
    promise = fetchFn().then(async (val) => {
      await cacheSet(key, val, ttlSeconds);
      pendingPromises.delete(key);
      return val;
    }).catch((err) => {
      pendingPromises.delete(key);
      throw err;
    });
    pendingPromises.set(key, promise);
  }

  return promise;
}

export const invalidate = cacheDelete;

