import { addToDenylist, isDenylisted, getClient } from '../../../packages/redis/src/index';

describe('JWT denylist', () => {
  const keyPrefix = 'denylist:jti:';

  afterEach(async () => {
    const redis = getClient();
    const keys = await redis.keys(`${keyPrefix}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  it('isBlocked returns false for unknown jti', async () => {
    const res = await isDenylisted('unknown-jti');
    expect(res).toBe(false);
  });

  it('isBlocked returns true after add()', async () => {
    const jti = 'jti-123';
    await addToDenylist(jti, 60);

    const res = await isDenylisted(jti);
    expect(res).toBe(true);
  });

  it('key auto-expires after TTL', async () => {
    const jti = 'jti-exp';
    await addToDenylist(jti, 1); // TTL of 1 second

    const before = await isDenylisted(jti);
    expect(before).toBe(true);

    // Wait 1.1s
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const after = await isDenylisted(jti);
    expect(after).toBe(false);
  });
});
