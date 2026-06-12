import { Prisma } from "@prisma/client";
import { getClient } from "../client";

export const eventRepository = {
  async create(data: Prisma.EventCreateInput) {
    return getClient().event.create({ data });
  },

  async findById(id: string) {
    return getClient().event.findUnique({ where: { id } });
  },

  async updateStatus(id: string, status: string) {
    return getClient().event.update({ where: { id }, data: { status } });
  },

  async findByOrg(
    orgId: string,
    filters: { status?: string; pipelineId?: string; from?: Date; to?: Date },
    skip = 0,
    take = 20,
  ) {
    const where: Prisma.EventWhereInput = { orgId };
    if (filters.status) where.status = filters.status;
    if (filters.pipelineId) where.pipelineId = filters.pipelineId;
    if (filters.from || filters.to) {
      where.receivedAt = {};
      if (filters.from) where.receivedAt.gte = filters.from;
      if (filters.to) where.receivedAt.lte = filters.to;
    }

    const [events, total] = await Promise.all([
      getClient().event.findMany({
        where,
        skip,
        take,
        orderBy: { receivedAt: "desc" },
      }),
      getClient().event.count({ where }),
    ]);
    return { events, total };
  },
};
