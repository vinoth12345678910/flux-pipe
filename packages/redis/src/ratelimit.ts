import { getClient } from "./client";

interface SlidingWindowResult {
  current: number;
  blocked: boolean;
  resetAt: number;
}

export async function slidingWindow(key: string, maxRequests: number, windowSeconds: number): Promise<SlidingWindowResult> {
  const client = getClient();
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  const multi = client.multi();
  multi.zremrangebyscore(key, 0, windowStart);
  multi.zadd(key, now, `${now}-${Math.random()}`);
  multi.zcard(key);
  multi.expire(key, windowSeconds);
  multi.pttl(key);

  const results = await multi.exec();
  if (!results) {
    return { current: 0, blocked: false, resetAt: now + windowSeconds * 1000 };
  }

  const count = results[2]?.[1] as number || 0;
  const ttl = results[4]?.[1] as number || windowSeconds * 1000;

  return {
    current: count,
    blocked: count > maxRequests,
    resetAt: now + ttl,
  };
}
