import { getClient } from '../../packages/redis/src/index';

export async function getKey(key: string): Promise<string | null> {
  const redis = getClient();
  return redis.get(key);
}

export async function flushTestKeys(): Promise<void> {
  const redis = getClient();
  const keys = await redis.keys('test:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

export async function getIdempotencyKey(orgId: string, key: string): Promise<string | null> {
  const redis = getClient();
  // The system uses a key format for idempotency. Let's see what format the service uses.
  // By checking the service, it's typically: "idempotency:{orgId}:{key}"
  return redis.get(`idempotency:${orgId}:${key}`);
}
