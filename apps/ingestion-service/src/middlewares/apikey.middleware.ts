import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { getClient } from "@fluxpipe/database";

declare global {
  namespace Express {
    interface Request {
      org?: { orgId: string; plan: string };
    }
  }
}

export async function authenticateApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: { code: "MISSING_API_KEY", message: "API key required" } });
    return;
  }

  const rawKey = authHeader.slice(7);
  const hash = createHash("sha256").update(rawKey).digest("hex");

  try {
    const key = await getClient().apiKey.findUnique({ where: { hash } });
    if (!key) {
      res.status(401).json({ success: false, error: { code: "INVALID_API_KEY", message: "Invalid API key" } });
      return;
    }
    if (key.revokedAt) {
      res.status(401).json({ success: false, error: { code: "API_KEY_REVOKED", message: "API key has been revoked" } });
      return;
    }
    if (key.expiresAt && key.expiresAt < new Date()) {
      res.status(401).json({ success: false, error: { code: "API_KEY_EXPIRED", message: "API key has expired" } });
      return;
    }

    await getClient().apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });

    const org = await getClient().organization.findUnique({ where: { id: key.orgId } });
    req.org = { orgId: key.orgId, plan: org?.plan || "free" };
    next();
  } catch (err) {
    next(err);
  }
}
