import { getClient } from "@fluxpipe/database";
import { AppError } from "@fluxpipe/shared-utils";
import { publishEvent } from "@fluxpipe/rabbitmq";

export const replayService = {
  async replayEvent(eventId: string, orgId: string) {
    const event = await getClient().event.findUnique({
      where: { id: eventId },
      include: { pipeline: true },
    });

    if (!event) throw new AppError(404, "NOT_FOUND", "Event not found");
    if (event.orgId !== orgId) throw new AppError(403, "FORBIDDEN", "Event does not belong to this organization");
    if (event.status !== "partial_failure" && event.status !== "failed") {
      throw new AppError(400, "INVALID_STATUS", "Only failed or partial_failure events can be replayed");
    }

    await getClient().event.update({
      where: { id: eventId },
      data: { status: "pending", processedAt: null, deliveredAt: null },
    });

    await publishEvent("events.retry", `event.${orgId}.${event.pipelineId}`, {
      eventId: event.id,
      orgId,
      pipelineId: event.pipelineId,
      payload: event.payload,
    });

    return { eventId, status: "pending" };
  },
};
