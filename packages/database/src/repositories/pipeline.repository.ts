import { Prisma } from "@prisma/client";
import { getClient } from "../client";

export const pipelineRepository = {
  async findById(id: string) {
    return getClient().pipeline.findUnique({ where: { id } });
  },

  async findByOrg(orgId: string, skip = 0, take = 20) {
    const [pipelines, total] = await Promise.all([
      getClient().pipeline.findMany({
        where: { orgId },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      getClient().pipeline.count({ where: { orgId } }),
    ]);
    return { pipelines, total };
  },

  async create(data: Prisma.PipelineCreateInput) {
    return getClient().pipeline.create({ data });
  },

  async update(id: string, data: Prisma.PipelineUpdateInput) {
    return getClient().pipeline.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return getClient().pipeline.update({ where: { id }, data: { isActive: false } });
  },

  async findActive(orgId: string) {
    return getClient().pipeline.findMany({
      where: { orgId, isActive: true },
      orderBy: { createdAt: "desc" },
    });
  },
};
