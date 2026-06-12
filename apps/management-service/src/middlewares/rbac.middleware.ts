import { Request, Response, NextFunction } from "express";
import { Permission, hasPermission, Role, hasSufficientRole } from "@fluxpipe/auth";

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } });
      return;
    }
    if (!hasPermission(req.user.role as Role, permission)) {
      res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } });
      return;
    }
    next();
  };
}

export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } });
      return;
    }
    if (!hasSufficientRole(req.user.role as Role, role)) {
      res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Insufficient role" } });
      return;
    }
    next();
  };
}
