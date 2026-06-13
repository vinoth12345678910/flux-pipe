import { createClient, clients } from '../../helpers/api';
import { truncateAll } from '../../helpers/db';

describe('Management Service Auth Integration Tests', () => {
  const baseUrl = clients.management;

  beforeEach(async () => {
    await truncateAll();
  });

  describe('POST /v1/auth/register', () => {
    it('creates org + user, returns accessToken + refreshToken', async () => {
      const client = createClient(baseUrl);
      const res = await client
        .post('/v1/auth/register')
        .send({
          email: 'admin@fluxpipe.io',
          password: 'Password123!',
          name: 'Admin User',
          orgName: 'Admin Org',
          orgSlug: 'admin-org',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('returns 409 on duplicate email', async () => {
      const client = createClient(baseUrl);
      const payload = {
        email: 'dup@fluxpipe.io',
        password: 'Password123!',
        name: 'Dup User',
        orgName: 'Dup Org',
        orgSlug: 'dup-org',
      };

      await client.post('/v1/auth/register').send(payload);
      
      const res = await client.post('/v1/auth/register').send({
        ...payload,
        orgSlug: 'dup-org-2', // different slug
      });

      expect(res.status).toBe(409);
    });

    it('returns 400 on weak password (< 8 chars)', async () => {
      const client = createClient(baseUrl);
      const res = await client
        .post('/v1/auth/register')
        .send({
          email: 'weak@fluxpipe.io',
          password: 'weak',
          name: 'Weak User',
          orgName: 'Weak Org',
          orgSlug: 'weak-org',
        });

      expect(res.status).toBe(400);
    });

    it('returns 400 on missing fields', async () => {
      const client = createClient(baseUrl);
      const res = await client
        .post('/v1/auth/register')
        .send({
          email: 'missing@fluxpipe.io',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /v1/auth/login', () => {
    const registerPayload = {
      email: 'login@fluxpipe.io',
      password: 'Password123!',
      name: 'Login User',
      orgName: 'Login Org',
      orgSlug: 'login-org',
    };

    beforeEach(async () => {
      const client = createClient(baseUrl);
      await client.post('/v1/auth/register').send(registerPayload);
    });

    it('returns tokens on valid credentials', async () => {
      const client = createClient(baseUrl);
      const res = await client
        .post('/v1/auth/login')
        .send({
          email: registerPayload.email,
          password: registerPayload.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('returns 401 on wrong password', async () => {
      const client = createClient(baseUrl);
      const res = await client
        .post('/v1/auth/login')
        .send({
          email: registerPayload.email,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
    });

    it('returns 401 on unknown email', async () => {
      const client = createClient(baseUrl);
      const res = await client
        .post('/v1/auth/login')
        .send({
          email: 'unknown@fluxpipe.io',
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const client = createClient(baseUrl);
      const res = await client
        .post('/v1/auth/register')
        .send({
          email: 'refresh@fluxpipe.io',
          password: 'Password123!',
          name: 'Refresh User',
          orgName: 'Refresh Org',
          orgSlug: 'refresh-org',
        });
      refreshToken = res.body.data.refreshToken;
    });

    it('returns new token pair on valid refresh token', async () => {
      const client = createClient(baseUrl);
      const res = await client
        .post('/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('returns 401 on reused refresh token (rotation)', async () => {
      const client = createClient(baseUrl);
      
      // Use it once
      const res1 = await client
        .post('/v1/auth/refresh')
        .send({ refreshToken });
      expect(res1.status).toBe(200);

      // Use it again (should trigger reuse detection and revoke)
      const res2 = await client
        .post('/v1/auth/refresh')
        .send({ refreshToken });
      expect(res2.status).toBe(401);
    });
  });

  describe('POST /v1/auth/logout', () => {
    let accessToken: string;

    beforeEach(async () => {
      const client = createClient(baseUrl);
      const res = await client
        .post('/v1/auth/register')
        .send({
          email: 'logout@fluxpipe.io',
          password: 'Password123!',
          name: 'Logout User',
          orgName: 'Logout Org',
          orgSlug: 'logout-org',
        });
      accessToken = res.body.data.accessToken;
    });

    it('adds jti to Redis denylist and subsequent requests return 401', async () => {
      const clientAuthed = createClient(baseUrl, accessToken);

      // Verify token works
      const testRes = await clientAuthed.get('/v1/pipelines');
      expect(testRes.status).toBe(200);

      // Logout
      const logoutRes = await clientAuthed.post('/v1/auth/logout');
      expect(logoutRes.status).toBe(200);

      // Try request again
      const testResAfter = await clientAuthed.get('/v1/pipelines');
      expect(testResAfter.status).toBe(401);
    });
  });
});
