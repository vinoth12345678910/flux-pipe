import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import { success, error } from "@fluxpipe/shared-utils";

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      success(res, result, 201);
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      success(res, result);
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refresh(refreshToken);
      success(res, result);
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        error(res, 401, "UNAUTHORIZED", "Not authenticated");
        return;
      }
      const exp = req.user.jti ? 3600 : 3600;
      await authService.logout(req.user.jti, Math.floor(Date.now() / 1000) + exp);
      success(res, { message: "Logged out successfully" });
    } catch (err) {
      next(err);
    }
  },
};
