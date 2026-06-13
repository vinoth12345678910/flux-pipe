import Redis from "ioredis";

let client: Redis | null = null;

export function getClient(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      lazyConnect: true,
    });

    client.on("error", (err) => {
      console.error("Redis client error:", err.message);
    });
  }
  return client;
}

export function getWorkerConnection(): Redis {
  return new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 100, 3000),
    lazyConnect: true,
  });
}


export async function connectClient(): Promise<void> {
  if (!client) getClient();
  if (client && client.status !== "ready" && client.status !== "connecting") {
    await client.connect();
  }
}

export async function disconnectClient(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
