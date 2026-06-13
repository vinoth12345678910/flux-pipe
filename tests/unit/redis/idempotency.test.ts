import { checkIdempotency, storeIdempotencyKey, getClient } from '../../../packages/redis/src/index';

describe('idempotency keys', () => {
  const keyPrefix = 'idempotency:';

  afterEach(async () => {
    const redis = getClient();
    const keys = await redis.keys(`${keyPrefix}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  async function setIdempotencyHelper(orgId: string, idempotencyKey: string, eventId: string): Promise<boolean> {
    const existing = await checkIdempotency(orgId, idempotencyKey);
    if (existing !== null) return false;
    await storeIdempotencyKey(orgId, idempotencyKey, eventId);
    return true;
  }

  it('set returns true on first write', async () => {
    const orgId = 'org-1';
    const key = 'key-1';
    const eventId = 'evt-1';

    const first = await setIdempotencyHelper(orgId, key, eventId);
    expect(first).toBe(true);
  });

  it('set returns false on duplicate key', async () => {
    const orgId = 'org-1';
    const key = 'key-1';
    const eventId = 'evt-1';

    await setIdempotencyHelper(orgId, key, eventId);
    const second = await setIdempotencyHelper(orgId, key, 'evt-2');
    expect(second).toBe(false);
  });

  it('get returns eventId after set', async () => {
    const orgId = 'org-1';
    const key = 'key-1';
    const eventId = 'evt-1';

    await storeIdempotencyKey(orgId, key, eventId);
    const res = await checkIdempotency(orgId, key);
    expect(res).toBe(eventId);
  });

  it('get returns null for unknown key', async () => {
    const res = await checkIdempotency('org-1', 'unknown');
    expect(res).toBeNull();
  });

  it('key expires after 24 hours TTL', async () => {
    const orgId = 'org-1';
    const key = 'key-ttl';
    const eventId = 'evt-1';

    await storeIdempotencyKey(orgId, key, eventId);
    const redis = getClient();
    const ttl = await redis.ttl(`idempotency:${orgId}:${key}`);
    expect(ttl).toBeGreaterThan(86300);
    expect(ttl).toBeLessThanOrEqual(86400);
  });

  it('different orgIds are isolated', async () => {
    const key = 'key-dup';
    const eventId = 'evt-1';

    const org1 = await setIdempotencyHelper('org-a', key, eventId);
    const org2 = await setIdempotencyHelper('org-b', key, eventId);

    expect(org1).toBe(true);
    expect(org2).toBe(true);
  });
});
