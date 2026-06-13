import { Request, Response, NextFunction } from "express";
import { verifyToken, hasSufficientRole, Role, type TokenPayload } from "@fluxpipe/auth";
import { isDenylisted } from "@fluxpipe/redis";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Missing or invalid token" } });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    const denylisted = await isDenylisted(payload.jti);
    if (denylisted) {
      res.status(401).json({ success: false, error: { code: "TOKEN_REVOKED", message: "Token has been revoked" } });
      return;
    }
    if (!hasSufficientRole(payload.role as Role, Role.Admin)) {
      res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Admin access required" } });
      return;
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, error: { code: "INVALID_TOKEN", message: "Token is invalid or expired" } });
  }
}
