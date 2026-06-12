import { Prisma } from "@prisma/client";
import { getClient } from "../client";

export const orgRepository = {
  async findById(id: string) {
    return getClient().organization.findUnique({ where: { id } });
  },

  async findBySlug(slug: string) {
    return getClient().organization.findUnique({ where: { slug } });
  },

  async create(data: Prisma.OrganizationCreateInput) {
    return getClient().organization.create({ data });
  },

  async updatePlan(id: string, plan: string) {
    return getClient().organization.update({ where: { id }, data: { plan } });
  },
};
