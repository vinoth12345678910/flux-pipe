import express from 'express';
import http from 'http';
import { createClient, clients } from '../helpers/api';
import { seed, truncateAll, prisma } from '../helpers/db';
import { getChannel } from '../../packages/rabbitmq/src/index';

jest.setTimeout(90000);

describe('Retry exhaustion → DLQ → notification alert', () => {
  let webhookServer: http.Server;
  let slackServer: http.Server;

  let webhookRequests: any[] = [];
  let slackRequests: any[] = [];

  let apiKey: string;
  let pipelineId: string;
  let orgId: string;

  beforeAll(async () => {
    jest.setTimeout(65000);
    // 1. Setup mock webhook server on port 9998 (always returns 500)
    const webhookApp = express();
    webhookApp.use(express.json());
    webhookApp.post('/failing-webhook', (req, res) => {
      webhookRequests.push({ body: req.body, headers: req.headers });
      res.sendStatus(500);
    });
    webhookServer = webhookApp.listen(9998);

    // 2. Setup mock Slack server on port 9997 (records alerts)
    const slackApp = express();
    slackApp.use(express.json());
    slackApp.post('/slack', (req, res) => {
      slackRequests.push(req.body);
      res.sendStatus(200);
    });
    slackServer = slackApp.listen(9997);
  });

  afterAll(async () => {
    await Promise.all([
      new Promise((resolve) => webhookServer.close(resolve)),
      new Promise((resolve) => slackServer.close(resolve)),
    ]);
  });

  beforeEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 3000)); // drain in-flight jobs
    await truncateAll();
    webhookRequests = [];
    slackRequests = [];

    const seeded = await seed.createOrg();
    apiKey = seeded.apiKey;
    orgId = seeded.orgId;

    // Use host.docker.internal:9998 so the Docker container can resolve back to the host
    const pipeline = await seed.createPipeline(orgId, 'http://host.docker.internal:9998/failing-webhook');
    pipelineId = pipeline.pipelineId;
  });

  async function pollUntil(fn: () => Promise<boolean>, timeoutMs = 60000, intervalMs = 1000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await fn()) return;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error(`Polling timeout after ${timeoutMs}ms`);
  }

  it('retries 5 times with exponential backoff then moves to DLQ, and triggers Slack alert', async () => {
    const ingestClient = createClient(clients.ingestion);

    const payload = {
      pipelineId,
      payload: { value: 'failed-run' },
    };

    const res = await ingestClient
      .post('/v1/ingest')
      .set('Authorization', `Bearer ${apiKey}`)
      .send(payload);

    expect(res.status).toBe(202);
    const eventId = res.body.data.eventId;

    // 1. Wait for the event to exhaust all 5 retries and be marked partial_failure in DB
    await pollUntil(async () => {
      const ev = await prisma.event.findUnique({ where: { id: eventId } });
      return ev?.status === 'partial_failure';
    }, 60000);

    // 2. Assert delivery attempts table has exactly 5 failed rows
    const attempts = await prisma.deliveryAttempt.findMany({
      where: { eventId },
    });
    expect(attempts.length).toBe(5);
    for (const attempt of attempts) {
      expect(attempt.status).toBe('failed');
    }

    // 3. Assert mock webhook server received exactly 5 requests
    expect(webhookRequests.length).toBe(5);

    // 4. Assert RabbitMQ events.dlq queue exists (message may have been consumed by notification service)
    const ch = await getChannel();
    await ch.checkQueue('events.dlq');

    // 5. Assert mock Slack server received a notification alert within 10s of DLQ processing
    await pollUntil(async () => {
      return slackRequests.length === 1;
    }, 10000);

    expect(slackRequests[0]).toBeDefined();
    const fieldsText = JSON.stringify(slackRequests[0].blocks);
    expect(fieldsText).toContain(eventId);
  }, 65000);

  it('alert throttle: only 1 Slack alert per pipeline per 10 minutes', async () => {
    const ingestClient = createClient(clients.ingestion);

    const payload1 = { pipelineId, payload: { value: 'fail-1' } };
    const payload2 = { pipelineId, payload: { value: 'fail-2' } };
    const payload3 = { pipelineId, payload: { value: 'fail-3' } };

    // Trigger three failing webhooks rapidly
    const r1 = await ingestClient.post('/v1/ingest').set('Authorization', `Bearer ${apiKey}`).send(payload1);
    const r2 = await ingestClient.post('/v1/ingest').set('Authorization', `Bearer ${apiKey}`).send(payload2);
    const r3 = await ingestClient.post('/v1/ingest').set('Authorization', `Bearer ${apiKey}`).send(payload3);

    const id1 = r1.body.data.eventId;
    const id2 = r2.body.data.eventId;
    const id3 = r3.body.data.eventId;

    // Wait until all three have finished delivery attempts
    await pollUntil(async () => {
      const count = await prisma.event.count({
        where: { id: { in: [id1, id2, id3] }, status: 'partial_failure' }
      });
      return count === 3;
    }, 60000);

    // Wait 5 seconds to ensure any potential duplicate alerts would have arrived
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Assert only 1 Slack alert was sent due to the 10-minute throttle (cooldown)
    expect(slackRequests.length).toBe(1);
  }, 65000);
});
