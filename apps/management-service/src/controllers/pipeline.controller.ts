import { Request, Response, NextFunction } from "express";
import { pipelineService } from "../services/pipeline.service";
import { success, paginated } from "@fluxpipe/shared-utils";

export const pipelineController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await pipelineService.list(req.user!.orgId, req.query as { page?: string; limit?: string });
      paginated(res, result.data, result.meta);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const pipeline = await pipelineService.getById(req.user!.orgId, req.params.id);
      success(res, pipeline);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const pipeline = await pipelineService.create(req.user!.orgId, req.body);
      success(res, pipeline, 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const pipeline = await pipelineService.update(req.user!.orgId, req.params.id, req.body);
      success(res, pipeline);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await pipelineService.delete(req.user!.orgId, req.params.id);
      success(res, { message: "Pipeline deleted" });
    } catch (err) {
      next(err);
    }
  },
};
