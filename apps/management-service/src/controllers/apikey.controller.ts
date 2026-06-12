import { Request, Response, NextFunction } from "express";
import { apikeyService } from "../services/apikey.service";
import { success } from "@fluxpipe/shared-utils";

export const apikeyController = {
  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await apikeyService.generate(req.user!.orgId, req.user!.userId, req.body.name);
      success(res, result, 201);
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const keys = await apikeyService.list(req.user!.orgId);
      success(res, keys);
    } catch (err) {
      next(err);
    }
  },

  async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      await apikeyService.revoke(req.params.id, req.user!.orgId);
      success(res, { message: "API key revoked" });
    } catch (err) {
      next(err);
    }
  },
};
