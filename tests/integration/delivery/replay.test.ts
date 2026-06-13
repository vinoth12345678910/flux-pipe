import { createClient, clients } from '../../helpers/api';
import { seed, truncateAll, prisma } from '../../helpers/db';
import { getChannel } from '../../../packages/rabbitmq/src/index';

describe('Delivery Service Replay Integration Tests', () => {
  const baseUrl = clients.delivery;
  let adminToken: string;
  let orgId: string;
  let pipelineId: string;

  beforeEach(async () => {
    await truncateAll();
    const seeded = await seed.createOrg();
    adminToken = seeded.accessToken;
    orgId = seeded.orgId;

    const pipeline = await seed.createPipeline(orgId);
    pipelineId = pipeline.pipelineId;
  });

  it('resets event status to pending and re-publishes to RabbitMQ', async () => {
    // 1. Create a failed event in DB
    const event = await prisma.event.create({
      data: {
        orgId,
        pipelineId,
        status: 'partial_failure',
        payload: { foo: 'bar' },
      },
    });

    const client = createClient(baseUrl, adminToken);

    // Assert it is currently partial_failure
    const before = await prisma.event.findUnique({ where: { id: event.id } });
    expect(before?.status).toBe('partial_failure');

    // Make replay call
    const res = await client.post(`/v1/deliveries/${event.id}/replay`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify it is reset to pending
    const after = await prisma.event.findUnique({ where: { id: event.id } });
    expect(after?.status).toBe('pending');
  });

  it('returns 404 for unknown eventId', async () => {
    const client = createClient(baseUrl, adminToken);
    const res = await client.post(`/v1/deliveries/00000000-0000-0000-0000-000000000000/replay`);
    expect(res.status).toBe(404);
  });

  it('returns 403 if event belongs to different org', async () => {
    // 1. Create event in Org B
    const seededB = await seed.createOrg('userb@fluxpipe.io', 'Password123!', 'admin');
    const pipelineB = await seed.createPipeline(seededB.orgId);

    const event = await prisma.event.create({
      data: {
        orgId: seededB.orgId,
        pipelineId: pipelineB.pipelineId,
        status: 'failed',
        payload: { foo: 'bar' },
      },
    });

    // 2. Try to replay as Org A (adminToken)
    const client = createClient(baseUrl, adminToken);
    const res = await client.post(`/v1/deliveries/${event.id}/replay`);
    expect(res.status).toBe(403);
  });

  it('returns 400 if event status is not partial_failure or failed', async () => {
    const event = await prisma.event.create({
      data: {
        orgId,
        pipelineId,
        status: 'delivered',
        payload: { foo: 'bar' },
      },
    });

    const client = createClient(baseUrl, adminToken);
    const res = await client.post(`/v1/deliveries/${event.id}/replay`);
    expect(res.status).toBe(400);
  });
});
