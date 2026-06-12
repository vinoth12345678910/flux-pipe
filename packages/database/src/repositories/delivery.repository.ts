import { Prisma } from "@prisma/client";
import { getClient } from "../client";

export const deliveryRepository = {
  async create(data: Prisma.DeliveryAttemptCreateInput) {
    return getClient().deliveryAttempt.create({ data });
  },

  async findByEvent(eventId: string) {
    return getClient().deliveryAttempt.findMany({
      where: { eventId },
      orderBy: { attemptedAt: "desc" },
    });
  },

  async findByDestination(destinationId: string, skip = 0, take = 20) {
    const [attempts, total] = await Promise.all([
      getClient().deliveryAttempt.findMany({
        where: { destinationId },
        skip,
        take,
        orderBy: { attemptedAt: "desc" },
      }),
      getClient().deliveryAttempt.count({ where: { destinationId } }),
    ]);
    return { attempts, total };
  },

  async countFailedByEvent(eventId: string) {
    return getClient().deliveryAttempt.count({
      where: { eventId, status: "failed" },
    });
  },
};
