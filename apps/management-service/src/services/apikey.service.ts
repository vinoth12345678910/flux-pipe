import { randomBytes, createHash } from "crypto";
import { getClient } from "@fluxpipe/database";
import { AppError } from "@fluxpipe/shared-utils";

function generatePrefix(): string {
  return "fp_live_" + randomBytes(4).toString("hex");
}

function generateFullKey(): string {
  return generatePrefix() + "_" + randomBytes(24).toString("hex");
}

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export const apikeyService = {
  async generate(orgId: string, userId: string, name: string) {
    const rawKey = generateFullKey();
    const prefix = rawKey.slice(0, 17);
    const hashed = hashKey(rawKey);

    await getClient().apiKey.create({
      data: {
        prefix,
        hash: hashed,
        name,
        scopes: ["*"],
        organization: { connect: { id: orgId } },
        user: { connect: { id: userId } },
      },
    });

    return { key: rawKey, prefix, name };
  },

  async list(orgId: string) {
    const keys = await getClient().apiKey.findMany({
      where: { orgId, revokedAt: null },
      select: { id: true, prefix: true, name: true, scopes: true, createdAt: true, lastUsedAt: true },
      orderBy: { createdAt: "desc" },
    });
    return keys;
  },

  async revoke(id: string, orgId: string) {
    const key = await getClient().apiKey.findUnique({ where: { id } });
    if (!key || key.orgId !== orgId) throw new AppError(404, "NOT_FOUND", "API key not found");
    return getClient().apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  },

  async verify(rawKey: string) {
    const hash = hashKey(rawKey);
    const key = await getClient().apiKey.findUnique({ where: { hash } });
    if (!key) throw new AppError(401, "INVALID_API_KEY", "Invalid API key");
    if (key.revokedAt) throw new AppError(401, "API_KEY_REVOKED", "API key has been revoked");
    if (key.expiresAt && key.expiresAt < new Date()) throw new AppError(401, "API_KEY_EXPIRED", "API key has expired");

    await getClient().apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });

    return { orgId: key.orgId, keyId: key.id };
  },
};
