import { Prisma } from "@prisma/client";
import { getClient } from "../client";

export const destinationRepository = {
  async findById(id: string) {
    return getClient().destination.findUnique({ where: { id } });
  },

  async findByPipeline(pipelineId: string) {
    return getClient().destination.findMany({ where: { pipelineId }, orderBy: { createdAt: "desc" } });
  },

  async create(data: Prisma.DestinationCreateInput) {
    return getClient().destination.create({ data });
  },

  async update(id: string, data: Prisma.DestinationUpdateInput) {
    return getClient().destination.update({ where: { id }, data });
  },

  async delete(id: string) {
    return getClient().destination.delete({ where: { id } });
  },
};
