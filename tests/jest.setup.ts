import dotenv from 'dotenv';
dotenv.config();

import { execSync } from 'child_process';
import { getClient as getDbClient, disconnectClient as disconnectDb } from '../packages/database/src/index';
import { getClient as getRedisClient, disconnectClient as disconnectRedis } from '../packages/redis/src/index';
import { getChannel, disconnect as disconnectRabbit } from '../packages/rabbitmq/src/index';

// Helper to wait for a service to be ready
async function retryUntilReady(name: string, fn: () => Promise<any>, retries = 20, delayMs = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      await fn();
      return;
    } catch (err: any) {
      if (i === retries - 1) {
        throw new Error(`Service ${name} not ready: ${err.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

import { initJwt } from '../packages/auth/src/index';

beforeAll(async () => {
  // Initialize JWT Configuration for Test Process
  initJwt({
    secret: process.env.JWT_SECRET || 'dev-jwt-secret-at-least-32-characters-long!!',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-at-least-32-characters-long',
  });

  // 1. Wait for Postgres, Redis, RabbitMQ
  await retryUntilReady('PostgreSQL', async () => {
    const db = getDbClient();
    await db.$queryRaw`SELECT 1`;
  });

  await retryUntilReady('Redis', async () => {
    const redis = getRedisClient();
    await redis.ping();
  });

  await retryUntilReady('RabbitMQ', async () => {
    const channel = await getChannel();
    await channel.checkExchange('events.ingested');
  });

  // 2. Run Database Migrations/Push to ensure schema is synchronized
  try {
    execSync('pnpm --filter @fluxpipe/database prisma:push', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'ignore',
    });
  } catch (err: any) {
    console.error('Prisma db push failed in setup:', err.message);
  }

  // 3. Assert exchanges and queues exist in RabbitMQ
  const ch = await getChannel();
  const exchanges = ['events.ingested', 'events.processed', 'events.failed', 'events.retry'];
  const queues = ['events.processing', 'events.dlq', 'delivery.webhook', 'events.retry.delay'];

  for (const ex of exchanges) {
    await ch.checkExchange(ex);
  }
  for (const q of queues) {
    await ch.checkQueue(q);
  }
});

afterAll(async () => {
  // 1. Truncate all tables
  const db = getDbClient();
  const tables = [
    'DeliveryAttempt',
    'EventLog',
    'Event',
    'Destination',
    'Pipeline',
    'ApiKey',
    'User',
    'Organization',
  ];

  for (const table of tables) {
    try {
      await db.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (err) {
      // Ignored if table doesn't exist yet
    }
  }

  // 2. Flush Redis test keys
  const redis = getRedisClient();
  const keys = await redis.keys('test:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }

  // 3. Close connections
  await disconnectDb();
  await disconnectRedis();
  await disconnectRabbit();
});
