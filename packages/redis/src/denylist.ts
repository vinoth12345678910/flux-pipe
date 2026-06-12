import { getClient } from "./client";

const DENYLIST_PREFIX = "denylist:jti:";

export async function addToDenylist(jti: string, ttlSeconds: number): Promise<void> {
  const client = getClient();
  const key = `${DENYLIST_PREFIX}${jti}`;
  await client.setex(key, Math.max(ttlSeconds, 60), "1");
}

export async function isDenylisted(jti: string): Promise<boolean> {
  const client = getClient();
  const key = `${DENYLIST_PREFIX}${jti}`;
  const result = await client.exists(key);
  return result === 1;
}
