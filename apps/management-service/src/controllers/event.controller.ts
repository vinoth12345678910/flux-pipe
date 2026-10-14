import { Request, Response, NextFunction } from "express";
import { getClient, eventRepository } from "@fluxpipe/database";
import { success, paginated, parsePagination, buildPaginationMeta, AppError } from "@fluxpipe/shared-utils";

export const eventController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query as Record<string, string | undefined>;
      const params = parsePagination(q);
      const { events, total } = await eventRepository.findByOrg(
        req.user!.orgId,
        {
          status: q.status || undefined,
          pipelineId: q.pipelineId || undefined,
          from: q.from ? new Date(q.from) : undefined,
          to: q.to ? new Date(q.to) : undefined,
        },
        params.skip,
        params.limit,
      );
      paginated(res, events, buildPaginationMeta(total, params));
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await getClient().event.findFirst({
        where: { id: req.params.id, orgId: req.user!.orgId },
        include: {
          deliveryAttempts: { orderBy: { attemptedAt: "desc" }, include: { destination: { select: { id: true, name: true, type: true } } } },
          eventLogs: { orderBy: { createdAt: "asc" } },
        },
      });
      if (!event) throw new AppError(404, "NOT_FOUND", "Event not found");
      // BigInt ids are not JSON-serialisable
      const eventLogs = event.eventLogs.map((l) => ({ ...l, id: l.id.toString() }));
      success(res, { ...event, eventLogs });
    } catch (err) {
      next(err);
    }
  },
};
