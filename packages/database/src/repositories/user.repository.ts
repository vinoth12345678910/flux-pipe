import { Prisma } from "@prisma/client";
import { getClient } from "../client";

export const userRepository = {
  async findById(id: string) {
    return getClient().user.findUnique({ where: { id } });
  },

  async findByEmail(email: string) {
    return getClient().user.findUnique({ where: { email } });
  },

  async create(data: Prisma.UserCreateInput) {
    return getClient().user.create({ data });
  },

  async updateRole(id: string, role: string) {
    return getClient().user.update({ where: { id }, data: { role } });
  },
};
