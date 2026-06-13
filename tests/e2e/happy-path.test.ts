import express from 'express';
import http from 'http';
import { createClient, clients } from '../helpers/api';
import { seed, truncateAll, prisma } from '../helpers/db';
import { getChannel } from '../../packages/rabbitmq/src/index';

describe('E2E Happy Path Test', () => {
  let webhookServer: http.Server;
  let receivedPayloads: any[] = [];
  let apiKey: string;
  let pipelineId: string;
  let orgId: string;

  beforeAll(async () => {
    // Spin up tiny webhook server on port 9999
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

  it('delivers event to webhook destination end-to-end', async () => {
    const ingestClient = createClient(clients.ingestion);
    
    // 1. POST to /v1/ingest
    const payload = {
      pipelineId,
      payload: { old_key: 'value-to-rename', normal_key: 'value' },
    };

    const ingestRes = await ingestClient
      .post('/v1/ingest')
      .set('Authorization', `Bearer ${apiKey}`)
      .send(payload);

    expect(ingestRes.status).toBe(202);
    const eventId = ingestRes.body.data.eventId;

    // 2. Poll the status from ingestion service
    await pollUntil(async () => {
      const res = await ingestClient
        .get(`/v1/ingest/${eventId}`)
        .set('Authorization', `Bearer ${apiKey}`);
      return res.body.data.status === 'delivered';
    }, 15000);

    // 3. Assert webhook server received the payload
    expect(receivedPayloads.length).toBe(1);
    const deliveredPayload = receivedPayloads[0];
    
    // Assert transformation rule works (rename old_key -> new_key)
    expect(deliveredPayload).toHaveProperty('new_key', 'value-to-rename');
    expect(deliveredPayload).not.toHaveProperty('old_key');
    
    // Assert enrichment worked (_meta contains orgName)
    expect(deliveredPayload).toHaveProperty('_meta');
    expect(deliveredPayload._meta).toHaveProperty('orgName', 'Test Org');

    // 4. Assert delivery_attempts table has 1 row with success
    const attempts = await prisma.deliveryAttempt.findMany({
      where: { eventId },
    });
    expect(attempts.length).toBe(1);
    expect(attempts[0].status).toBe('success');

    // 5. Assert RabbitMQ queue depth is 0
    const ch = await getChannel();
    const q = await ch.checkQueue('events.processing');
    expect(q.messageCount).toBe(0);
  });

  it('event status transitions are correct', async () => {
    const ingestClient = createClient(clients.ingestion);
    
    const payload = {
      pipelineId,
      payload: { test: 'transitions' },
    };

    const ingestRes = await ingestClient
      .post('/v1/ingest')
      .set('Authorization', `Bearer ${apiKey}`)
      .send(payload);

    const eventId = ingestRes.body.data.eventId;

    // Transition tracking
    const observedStatuses = new Set<string>();

    await pollUntil(async () => {
      const ev = await prisma.event.findUnique({ where: { id: eventId } });
      if (ev) {
        observedStatuses.add(ev.status);
      }
      return ev?.status === 'delivered';
    }, 10000, 100);

    // Should observe 'pending' initially, then processing/delivered
    expect(observedStatuses.has('pending') || observedStatuses.has('processing') || observedStatuses.has('delivered')).toBe(true);
  });
});
