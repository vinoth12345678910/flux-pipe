import { getClient } from "@fluxpipe/database";

export const deliveryService = {
  async logAttempt(data: {
    eventId: string;
    destinationId: string;
    attemptNumber: number;
    status: string;
    responseCode?: number;
    latencyMs?: number;
    errorMessage?: string;
  }) {
    return getClient().deliveryAttempt.create({ data });
  },

  async getDestinations(pipelineId: string) {
    return getClient().destination.findMany({
      where: { pipelineId, isActive: true },
    });
  },

  async markDelivered(eventId: string) {
    return getClient().event.update({
      where: { id: eventId },
      data: { status: "delivered", deliveredAt: new Date() },
    });
  },

  async markPartialFailure(eventId: string) {
    return getClient().event.update({
      where: { id: eventId },
      data: { status: "partial_failure" },
    });
  },

  async getDeliveryDetails(eventId: string) {
    const event = await getClient().event.findUnique({
      where: { id: eventId },
      include: {
        deliveryAttempts: { orderBy: { attemptedAt: "desc" } },
      },
    });
    return event;
  },
};
