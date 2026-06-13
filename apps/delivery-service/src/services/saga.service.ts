import { eventRepository, destinationRepository } from "@fluxpipe/database";
import { publishEvent } from "@fluxpipe/rabbitmq";
import { createLogger } from "@fluxpipe/logger";
import { Queue } from "bullmq";
import { getClient } from "@fluxpipe/redis";

const logger = createLogger("delivery-service");

const deliveryQueue = new Queue("deliver", { connection: getClient() as any });

interface SagaResult {
  success: boolean;
  failedDestinations: string[];
}

export class DeliverEventSaga {
  async execute(eventId: string, orgId: string, pipelineId: string, payload: Record<string, unknown>): Promise<SagaResult> {
    logger.info("Saga started", { eventId });

    await eventRepository.updateStatus(eventId, "delivering");

    const destinations = await destinationRepository.findByPipeline(pipelineId);
    if (!destinations.length) {
      throw new Error("No destinations configured");
    }

    logger.info("Destinations loaded", { count: destinations.length });

    const jobs = destinations.map((destination) =>
      deliveryQueue.add("deliver-event", {
        eventId,
        orgId,
        destinationId: destination.id,
        payload,
      }, {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 100,
        },
      })
    );

    const results = await Promise.allSettled(jobs);

    const failedDestinations = results
      .map((result, index) => ({ result, destination: destinations[index] }))
      .filter((item) => item.result.status === "rejected")
      .map((item) => item.destination.id);

    if (failedDestinations.length === 0) {
      await eventRepository.updateStatus(eventId, "delivered");
      logger.info("Event delivered successfully", { eventId });
      return { success: true, failedDestinations: [] };
    }

    logger.warn("Partial failure detected", { eventId, failedDestinations });
    await eventRepository.updateStatus(eventId, "partial_failure");

    await publishEvent("events.failed", "dlq", {
      eventId,
      orgId,
      pipelineId,
      failedDestinations,
    });

    logger.warn("Failure event published", { eventId });
    return { success: false, failedDestinations };
  }
}

export const sagaService = new DeliverEventSaga();
