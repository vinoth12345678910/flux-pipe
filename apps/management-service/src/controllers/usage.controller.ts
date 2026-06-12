import { Request, Response, NextFunction } from "express";
import { getClient } from "@fluxpipe/database";
import { success } from "@fluxpipe/shared-utils";

export const usageController = {
  async getUsage(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.orgId;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [eventsToday, eventsThisMonth, totalEvents, successCount, pipelineCount, destinationCount] =
        await Promise.all([
          getClient().event.count({ where: { orgId, receivedAt: { gte: startOfToday } } }),
          getClient().event.count({ where: { orgId, receivedAt: { gte: startOfMonth } } }),
          getClient().event.count({ where: { orgId } }),
          getClient().event.count({ where: { orgId, status: "delivered" } }),
          getClient().pipeline.count({ where: { orgId } }),
          getClient().destination.count({
            where: { pipeline: { orgId } },
          }),
        ]);

      success(res, {
        eventsToday,
        eventsThisMonth,
        totalEvents,
        deliverySuccessRate: totalEvents > 0 ? Math.round((successCount / totalEvents) * 10000) / 100 : 0,
        pipelineCount,
        destinationCount,
      });
    } catch (err) {
      next(err);
    }
  },
};
