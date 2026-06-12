import { Request, Response, NextFunction } from "express";
import { slidingWindow } from "@fluxpipe/redis";

const PLAN_LIMITS: Record<string, number> = {
  free: 100,
  pro: 10000,
  enterprise: 100000,
};

export async function rateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  const orgId = req.org?.orgId;
  const plan = req.org?.plan || "free";
  const limit = PLAN_LIMITS[plan] || 100;

  if (!orgId) {
    next();
    return;
  }

  const authHeader = req.headers.authorization || "";
  const apiKey = authHeader.slice(7);
  const key = `ratelimit:${apiKey}`;

  try {
    const result = await slidingWindow(key, limit, 60);

    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - result.current));
    res.setHeader("X-RateLimit-Reset", result.resetAt);

    if (result.blocked) {
      res.status(429).json({
        success: false,
        error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests" },
      });
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
}
