import { getClient } from "@fluxpipe/database";
import { checkIdempotency, storeIdempotencyKey } from "@fluxpipe/redis";
import { publishEvent } from "@fluxpipe/rabbitmq";
import { createLogger } from "@fluxpipe/logger";
import { AppError } from "@fluxpipe/shared-utils";

const logger = createLogger("ingestion-service");

export const ingestService = {
  async ingestSingle(
    orgId: string,
    pipelineId: string,
    payload: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<{ eventId: string }> {
    if (idempotencyKey) {
      const cached = await checkIdempotency(orgId, idempotencyKey);
      if (cached) {
        logger.info(`Idempotency hit for key ${idempotencyKey}, returning cached eventId ${cached}`);
        return { eventId: cached };
      }
    }

    const pipeline = await getClient().pipeline.findUnique({ where: { id: pipelineId } });
    if (!pipeline || !pipeline.isActive || pipeline.orgId !== orgId) {
      throw new AppError(400, "INVALID_PIPELINE", "Pipeline not found or inactive");
    }

    const event = await getClient().event.create({
      data: {
        orgId,
        pipelineId,
        status: "pending",
        payload: payload as any,
        idempotencyKey: idempotencyKey || null,
      },
    });

    await publishEvent("events.ingested", `event.${orgId}.${pipelineId}`, {
      eventId: event.id,
      orgId,
      pipelineId,
      payload,
    });

    if (idempotencyKey) {
      await storeIdempotencyKey(orgId, idempotencyKey, event.id);
    }

    logger.info("Event ingested", { eventId: event.id, pipelineId, orgId });
    return { eventId: event.id };
  },

  async ingestBatch(
    orgId: string,
    events: Array<{ pipelineId: string; payload: Record<string, unknown>; idempotencyKey?: string }>,
  ): Promise<{ succeeded: Array<{ eventId: string }>; failed: Array<{ pipelineId: string; error: string }> }> {
    const succeeded: Array<{ eventId: string }> = [];
    const failed: Array<{ pipelineId: string; error: string }> = [];

    for (const event of events) {
      try {
        const result = await this.ingestSingle(orgId, event.pipelineId, event.payload, event.idempotencyKey);
        succeeded.push(result);
      } catch (err: unknown) {
        const message = err instanceof AppError ? err.message : "Unknown error";
        failed.push({ pipelineId: event.pipelineId, error: message });
      }
    }

    return { succeeded, failed };
  },

  async getEventStatus(eventId: string) {
    const event = await getClient().event.findUnique({
      where: { id: eventId },
      select: { id: true, status: true, payload: true, receivedAt: true, processedAt: true, deliveredAt: true },
    });
    return event;
  },
};
