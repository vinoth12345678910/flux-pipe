import { getClient } from "./client";

const IDEMPOTENCY_TTL = 86400;

export async function checkIdempotency(orgId: string, idempotencyKey: string): Promise<string | null> {
  const client = getClient();
  const key = `idempotency:${orgId}:${idempotencyKey}`;
  const cached = await client.get(key);
  return cached;
}

export async function storeIdempotencyKey(orgId: string, idempotencyKey: string, eventId: string): Promise<void> {
  const client = getClient();
  const key = `idempotency:${orgId}:${idempotencyKey}`;
  await client.setex(key, IDEMPOTENCY_TTL, eventId);
}
