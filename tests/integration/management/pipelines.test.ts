import { createClient, clients } from '../../helpers/api';
import { seed, truncateAll } from '../../helpers/db';

describe('Pipeline CRUD Integration Tests', () => {
  const baseUrl = clients.management;
  let adminToken: string;
  let orgId: string;

  beforeEach(async () => {
    await truncateAll();
    const seeded = await seed.createOrg();
    adminToken = seeded.accessToken;
    orgId = seeded.orgId;
  });

  it('POST /v1/pipelines — creates pipeline, returns 201', async () => {
    const client = createClient(baseUrl, adminToken);
    const res = await client
      .post('/v1/pipelines')
      .send({
        name: 'My New Pipeline',
        config: { rules: [] },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.name).toBe('My New Pipeline');
  });

  it('GET /v1/pipelines — lists only own org pipelines', async () => {
    // 1. Create pipeline in Org A (own org)
    const clientA = createClient(baseUrl, adminToken);
    await clientA
      .post('/v1/pipelines')
      .send({ name: 'Org A Pipeline', config: {} });

    // 2. Create another Org B
    const seededB = await seed.createOrg('userb@fluxpipe.io', 'Password123!', 'admin');
    const clientB = createClient(baseUrl, seededB.accessToken);
    await clientB
      .post('/v1/pipelines')
      .send({ name: 'Org B Pipeline', config: {} });

    // 3. GET pipelines as Org A
    const resA = await clientA.get('/v1/pipelines');
    expect(resA.status).toBe(200);
    expect(resA.body.data.length).toBe(1);
    expect(resA.body.data[0].name).toBe('Org A Pipeline');
  });

  it('GET /v1/pipelines/:id — returns 404 for another org pipeline', async () => {
    // Create pipeline in Org B
    const seededB = await seed.createOrg('userb@fluxpipe.io', 'Password123!', 'admin');
    const clientB = createClient(baseUrl, seededB.accessToken);
    const createRes = await clientB
      .post('/v1/pipelines')
      .send({ name: 'Org B Pipeline', config: {} });
    const pipelineId = createRes.body.data.id;

    // Get pipelineId as Org A (adminToken)
    const clientA = createClient(baseUrl, adminToken);
    const getRes = await clientA.get(`/v1/pipelines/${pipelineId}`);
    expect(getRes.status).toBe(404);
  });

  it('PUT /v1/pipelines/:id — updates name and config', async () => {
    const client = createClient(baseUrl, adminToken);
    const createRes = await client
      .post('/v1/pipelines')
      .send({ name: 'Old Pipeline Name', config: { rules: [] } });
    const pipelineId = createRes.body.data.id;

    const updateRes = await client
      .put(`/v1/pipelines/${pipelineId}`)
      .send({ name: 'New Pipeline Name', config: { updated: true } });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe('New Pipeline Name');
  });

  it('DELETE /v1/pipelines/:id — soft deletes (isActive = false)', async () => {
    const client = createClient(baseUrl, adminToken);
    const createRes = await client
      .post('/v1/pipelines')
      .send({ name: 'To Delete', config: {} });
    const pipelineId = createRes.body.data.id;

    const deleteRes = await client.delete(`/v1/pipelines/${pipelineId}`);
    expect(deleteRes.status).toBe(200);

    // Fetch again, should not list or should be marked inactive in DB
    const getRes = await client.get(`/v1/pipelines/${pipelineId}`);
    expect(getRes.status).toBe(404); // Or inactive
  });

  it('viewer role cannot create pipeline — returns 403', async () => {
    const seededViewer = await seed.createOrg('viewer@fluxpipe.io', 'Password123!', 'viewer');
    const client = createClient(baseUrl, seededViewer.accessToken);

    const res = await client
      .post('/v1/pipelines')
      .send({ name: 'Viewer Pipeline', config: {} });

    expect(res.status).toBe(403);
  });

  it('operator role cannot delete pipeline — returns 403', async () => {
    // 1. Create pipeline as Admin
    const clientAdmin = createClient(baseUrl, adminToken);
    const createRes = await clientAdmin
      .post('/v1/pipelines')
      .send({ name: 'Admin Pipeline', config: {} });
    const pipelineId = createRes.body.data.id;

    // 2. Try to delete as Operator
    // Wait, Operator needs to belong to the same org! So we create a user with operator role in orgId.
    const prisma = require('../../helpers/db').prisma;
    const bcrypt = require('@fluxpipe/auth');
    const operatorUser = await prisma.user.create({
      data: {
        email: 'operator@fluxpipe.io',
        passwordHash: await bcrypt.hashPassword('Password123!'),
        name: 'Operator User',
        role: 'operator',
        orgId: orgId,
      },
    });

    const jwt = require('@fluxpipe/auth');
    const operatorToken = jwt.signAccessToken({
      userId: operatorUser.id,
      orgId: orgId,
      role: 'operator',
      scopes: ['*'],
    });

    const clientOperator = createClient(baseUrl, operatorToken);
    const res = await clientOperator.delete(`/v1/pipelines/${pipelineId}`);
    expect(res.status).toBe(403);
  });
});
