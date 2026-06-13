import { randomBytes, createHash } from 'crypto';
import { getClient } from '../../packages/database/src/index';
import { hashPassword, signAccessToken } from '../../packages/auth/src/index';

export const prisma = getClient();

export const seed = {
  async createOrg(email = 'test@example.com', password = 'Password123!', role = 'admin') {
    // 1. Create Organization
    const slug = 'test-org-' + randomBytes(4).toString('hex');
    const org = await prisma.organization.create({
      data: {
        name: 'Test Org',
        slug,
      },
    });

    // 2. Create User
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name: 'Test User',
        role,
        orgId: org.id,
      },
    });

    // 3. Generate Access Token
    const accessToken = signAccessToken({
      userId: user.id,
      orgId: org.id,
      role: user.role,
      scopes: ['*'],
    });

    // 4. Generate API Key
    const rawKey = 'fp_live_' + randomBytes(4).toString('hex') + '_' + randomBytes(24).toString('hex');
    const prefix = rawKey.slice(0, 17);
    const hash = createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await prisma.apiKey.create({
      data: {
        prefix,
        hash,
        name: 'Default API Key',
        scopes: ['*'],
        orgId: org.id,
        userId: user.id,
      },
    });

    return {
      orgId: org.id,
      userId: user.id,
      accessToken,
      apiKey: rawKey,
    };
  },

  async createPipeline(orgId: string, destinationUrl = 'http://localhost:9999/webhook') {
    const pipeline = await prisma.pipeline.create({
      data: {
        name: 'Test Pipeline',
        orgId,
        isActive: true,
        config: {
          transformRules: [
            {
              action: 'rename',
              from: 'old_key',
              to: 'new_key',
            },
          ],
        },
      },
    });

    const destination = await prisma.destination.create({
      data: {
        name: 'Webhook Destination',
        type: 'webhook',
        pipelineId: pipeline.id,
        config: {
          url: destinationUrl,
        },
        isActive: true,
      },
    });

    return {
      pipelineId: pipeline.id,
      destinationId: destination.id,
    };
  },
};

export async function truncateAll() {
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
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (err) {
      // Ignore
    }
  }
}
