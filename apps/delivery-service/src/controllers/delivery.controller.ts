import { Request, Response, NextFunction } from "express";
import { deliveryService } from "../services/delivery.service";
import { replayService } from "../services/replay.service";
import { success } from "@fluxpipe/shared-utils";

export const deliveryController = {
  async getDeliveryDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const details = await deliveryService.getDeliveryDetails(req.params.eventId);
      if (!details) {
        res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Event not found" } });
        return;
      }
      success(res, details);
    } catch (err) {
      next(err);
    }
  },

  async replayEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await replayService.replayEvent(req.params.id, req.user!.orgId);
      success(res, result);
    } catch (err) {
      next(err);
    }
  },
};
