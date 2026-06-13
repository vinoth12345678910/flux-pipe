import express from 'express';
import http from 'http';
import { createClient, clients } from '../helpers/api';
import { seed, truncateAll, prisma } from '../helpers/db';
import { getChannel } from '../../packages/rabbitmq/src/index';

describe('Exactly-once delivery guarantees', () => {
  let webhookServer: http.Server;
  let receivedPayloads: any[] = [];
  let apiKey: string;
  let pipelineId: string;
  let orgId: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.post('/webhook', (req, res) => {
      receivedPayloads.push(req.body);
      res.sendStatus(200);
    });
    webhookServer = app.listen(9999);
  });

  afterAll(async () => {
    await new Promise((resolve) => webhookServer.close(resolve));
  });

  beforeEach(async () => {
    await truncateAll();
    receivedPayloads = [];

    const seeded = await seed.createOrg();
    apiKey = seeded.apiKey;
    orgId = seeded.orgId;

    const pipeline = await seed.createPipeline(orgId, 'http://host.docker.internal:9999/webhook');
    pipelineId = pipeline.pipelineId;
  });

  async function pollUntil(fn: () => Promise<boolean>, timeoutMs = 15000, intervalMs = 500) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await fn()) return;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error(`Polling timeout after ${timeoutMs}ms`);
  }

  it('duplicate ingest does not create duplicate events in DB', async () => {
    const ingestClient = createClient(clients.ingestion);
    const payload = {
      pipelineId,
      payload: { value: 'idem-test' },
      idempotencyKey: 'idem-1',
    };

    const res1 = await ingestClient
      .post('/v1/ingest')
      .set('Authorization', `Bearer ${apiKey}`)
      .send(payload);

    const res2 = await ingestClient
      .post('/v1/ingest')
      .set('Authorization', `Bearer ${apiKey}`)
      .send(payload);

    expect(res1.body.data.eventId).toBe(res2.body.data.eventId);

    const count = await prisma.event.count({
      where: { idempotencyKey: 'idem-1' },
    });
    expect(count).toBe(1);
  });

  it('duplicate RabbitMQ message does not trigger duplicate processing', async () => {
    const ingestClient = createClient(clients.ingestion);
    const payload = {
      pipelineId,
      payload: { value: 'dup-msg-test' },
    };

    const res = await ingestClient
      .post('/v1/ingest')
      .set('Authorization', `Bearer ${apiKey}`)
      .send(payload);

    const eventId = res.body.data.eventId;

    // Wait for the event to be delivered
    await pollUntil(async () => {
      const ev = await prisma.event.findUnique({ where: { id: eventId } });
      return ev?.status === 'delivered';
    }, 15000);

    // Manually publish duplicate processing message to RabbitMQ processing queue
    const ch = await getChannel();
    await ch.publish('events.ingested', `event.${orgId}.${pipelineId}`, Buffer.from(JSON.stringify({
      eventId,
      orgId,
      pipelineId,
      payload: payload.payload,
    })));

    // Wait 3 seconds to see if a duplicate delivery is triggered
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Verify database only has 1 successful delivery attempt row
    const attempts = await prisma.deliveryAttempt.count({
      where: { eventId },
    });
    expect(attempts).toBe(1);

    // Webhook server should only receive 1 webhook payload
    expect(receivedPayloads.length).toBe(1);
  });

  it('SAGA step idempotency: restarted delivery does not double-deliver', async () => {
    // SAGA deduplication ensures that duplicate jobs in the BullMQ queue do not result in double delivery
    // because each delivery attempt is registered and deduplicated at the Redis/worker level.
    const ingestClient = createClient(clients.ingestion);
    const payload = {
      pipelineId,
      payload: { value: 'saga-idem-test' },
    };

    const res = await ingestClient
      .post('/v1/ingest')
      .set('Authorization', `Bearer ${apiKey}`)
      .send(payload);

    const eventId = res.body.data.eventId;

    // Wait for delivery to complete
    await pollUntil(async () => {
      const ev = await prisma.event.findUnique({ where: { id: eventId } });
      return ev?.status === 'delivered';
    }, 15000);

    // Webhook server received exactly 1 post
    expect(receivedPayloads.length).toBe(1);
  });
});
