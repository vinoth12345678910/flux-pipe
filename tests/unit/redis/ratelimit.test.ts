import { slidingWindow, getClient } from '../../../packages/redis/src/index';

describe('sliding window rate limiter', () => {
  const keyPrefix = 'test:ratelimit:';

  afterEach(async () => {
    const redis = getClient();
    const keys = await redis.keys(`${keyPrefix}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  function getRateLimitHelper(key: string, limit: number, windowSeconds: number) {
    return async () => {
      const res = await slidingWindow(key, limit, windowSeconds);
      return {
        allowed: !res.blocked,
        remaining: Math.max(0, limit - res.current),
        reset: res.resetAt,
      };
    };
  }

  it('allows requests under the limit', async () => {
    const key = `${keyPrefix}1`;
    const checkRateLimit = getRateLimitHelper(key, 5, 60);

    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(await checkRateLimit());
    }

    for (let i = 0; i < 5; i++) {
      expect(results[i].allowed).toBe(true);
      expect(results[i].remaining).toBe(4 - i);
    }
  });

  it('blocks the 6th request', async () => {
    const key = `${keyPrefix}2`;
    const checkRateLimit = getRateLimitHelper(key, 5, 60);

    for (let i = 0; i < 5; i++) {
      const res = await checkRateLimit();
      expect(res.allowed).toBe(true);
    }

    const res6 = await checkRateLimit();
    expect(res6.allowed).toBe(false);
    expect(res6.remaining).toBe(0);
  });

  it('resets after window expires', async () => {
    const key = `${keyPrefix}3`;
    const checkRateLimit = getRateLimitHelper(key, 2, 1); // 1 second window

    const r1 = await checkRateLimit();
    const r2 = await checkRateLimit();
    const r3 = await checkRateLimit();

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(false);

    // Wait 1.1s
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const r4 = await checkRateLimit();
    expect(r4.allowed).toBe(true);
  });

  it('different keys are independent', async () => {
    const keyA = `${keyPrefix}A`;
    const keyB = `${keyPrefix}B`;

    const limit = 2;
    const checkA = getRateLimitHelper(keyA, limit, 60);
    const checkB = getRateLimitHelper(keyB, limit, 60);

    // Exhaust A
    await checkA();
    await checkA();
    const a3 = await checkA();
    expect(a3.allowed).toBe(false);

    // B should still be allowed
    const b1 = await checkB();
    expect(b1.allowed).toBe(true);
  });

  it('returns correct X-RateLimit headers shape', async () => {
    const key = `${keyPrefix}headers`;
    const checkRateLimit = getRateLimitHelper(key, 5, 60);

    const res = await checkRateLimit();
    expect(res).toHaveProperty('allowed');
    expect(res).toHaveProperty('remaining');
    expect(res).toHaveProperty('reset');
    expect(typeof res.allowed).toBe('boolean');
    expect(typeof res.remaining).toBe('number');
    expect(typeof res.reset).toBe('number');
    expect(res.reset).toBeGreaterThan(Date.now());
  });
});
