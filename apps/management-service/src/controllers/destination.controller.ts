import { Request, Response, NextFunction } from "express";
import { destinationService } from "../services/destination.service";
import { success } from "@fluxpipe/shared-utils";

export const destinationController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const destinations = await destinationService.list(req.params.pipelineId);
      success(res, destinations);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const dest = await destinationService.getById(req.user!.orgId, req.params.id);
      success(res, dest);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dest = await destinationService.create(req.user!.orgId, req.body);
      success(res, dest, 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const dest = await destinationService.update(req.user!.orgId, req.params.id, req.body);
      success(res, dest);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await destinationService.delete(req.user!.orgId, req.params.id);
      success(res, { message: "Destination deleted" });
    } catch (err) {
      next(err);
    }
  },
};
