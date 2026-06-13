import { cacheGet, cacheSet, getOrSet, invalidate, getClient } from '../../../packages/redis/src/index';

describe('cache-aside', () => {
  const keyPrefix = 'test:cache:';

  afterEach(async () => {
    const redis = getClient();
    const keys = await redis.keys(`${keyPrefix}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  it('returns null on cache miss', async () => {
    const key = `${keyPrefix}miss`;
    const res = await cacheGet(key);
    expect(res).toBeNull();
  });

  it('stores and retrieves JSON correctly', async () => {
    const key = `${keyPrefix}json`;
    const data = { foo: 'bar', baz: 42 };
    await cacheSet(key, data);

    const res = await cacheGet<typeof data>(key);
    expect(res).toEqual(data);
  });

  it('respects TTL — key expires after ttl seconds', async () => {
    const key = `${keyPrefix}ttl`;
    const data = { hello: 'world' };
    await cacheSet(key, data, 1); // TTL of 1 second

    const res1 = await cacheGet(key);
    expect(res1).toEqual(data);

    // Wait 1.1s
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const res2 = await cacheGet(key);
    expect(res2).toBeNull();
  });

  it('getOrSet calls fetchFn on miss and caches result', async () => {
    const key = `${keyPrefix}getorset1`;
    const fetchFn = jest.fn().mockResolvedValue({ status: 'fresh' });

    const res = await getOrSet(key, fetchFn);
    expect(res).toEqual({ status: 'fresh' });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Assert it is actually in redis
    const inRedis = await cacheGet(key);
    expect(inRedis).toEqual({ status: 'fresh' });
  });

  it('getOrSet does NOT call fetchFn on hit', async () => {
    const key = `${keyPrefix}getorset2`;
    await cacheSet(key, { status: 'cached' });

    const fetchFn = jest.fn().mockResolvedValue({ status: 'fresh' });
    const res = await getOrSet(key, fetchFn);

    expect(res).toEqual({ status: 'cached' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('single-flight: concurrent misses call fetchFn only once', async () => {
    const key = `${keyPrefix}singleflight`;
    const fetchFn = jest.fn().mockImplementation(() => {
      return new Promise((resolve) => setTimeout(() => resolve({ val: 'slow' }), 100));
    });

    const results = await Promise.all([
      getOrSet(key, fetchFn),
      getOrSet(key, fetchFn),
      getOrSet(key, fetchFn),
      getOrSet(key, fetchFn),
      getOrSet(key, fetchFn),
    ]);

    for (const res of results) {
      expect(res).toEqual({ val: 'slow' });
    }
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('invalidate removes key', async () => {
    const key = `${keyPrefix}invalidate`;
    await cacheSet(key, { status: 'ok' });

    const resBefore = await cacheGet(key);
    expect(resBefore).toEqual({ status: 'ok' });

    await invalidate(key);

    const resAfter = await cacheGet(key);
    expect(resAfter).toBeNull();
  });
});
