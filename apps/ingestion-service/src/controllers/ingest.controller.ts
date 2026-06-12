import { Request, Response, NextFunction } from "express";
import { ingestService } from "../services/ingest.service";
import { success } from "@fluxpipe/shared-utils";

export const ingestController = {
  async ingestSingle(req: Request, res: Response, next: NextFunction) {
    try {
      const { pipelineId, payload, idempotencyKey } = req.body;
      const result = await ingestService.ingestSingle(
        req.org!.orgId,
        pipelineId,
        payload,
        idempotencyKey,
      );
      success(res, { eventId: result.eventId, status: "accepted" }, 202);
    } catch (err) {
      next(err);
    }
  },

  async ingestBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ingestService.ingestBatch(req.org!.orgId, req.body.events);
      success(res, { results: result, total: result.succeeded.length + result.failed.length }, 202);
    } catch (err) {
      next(err);
    }
  },

  async getEventStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await ingestService.getEventStatus(req.params.id);
      if (!event) {
        res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Event not found" } });
        return;
      }
      success(res, event);
    } catch (err) {
      next(err);
    }
  },
};
