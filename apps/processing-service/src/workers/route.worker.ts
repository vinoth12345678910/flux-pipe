import { Worker, Job } from "bullmq";
import { getClient } from "@fluxpipe/redis";
import { destinationRepository, eventRepository } from "@fluxpipe/database";
import { publishEvent } from "@fluxpipe/rabbitmq";
import { createLogger } from "@fluxpipe/logger";

const logger = createLogger("processing-service");

interface RouteJobData {
  eventId: string;
  orgId: string;
  pipelineId: string;
  enrichedPayload: Record<string, unknown>;
}

export const routeWorker = new Worker<RouteJobData>(
  "route",
  async (job: Job<RouteJobData>) => {
    const { eventId, orgId, pipelineId, enrichedPayload } = job.data;

    logger.info("Routing started", { eventId, pipelineId });

    const destinations = await destinationRepository.findByPipeline(pipelineId);
    const activeDestinations = destinations.filter((d) => d.isActive);

    if (activeDestinations.length === 0) {
      logger.warn("No active destinations found for pipeline", { pipelineId, eventId });
      // If no destinations, we consider it processed but with nothing to do
      await eventRepository.updateStatus(eventId, "processed");
      return;
    }

    for (const destination of activeDestinations) {
      logger.info("Forwarding to delivery", {
        eventId,
        destinationId: destination.id,
        type: destination.type,
      });

      // Forward to processed exchange for delivery-service to consume
      await publishEvent("events.processed", `delivery.${destination.type}`, {
        eventId,
        orgId,
        pipelineId,
        destinationId: destination.id,
        payload: enrichedPayload,
        config: destination.config,
      });
    }

    // Mark event as processed in the database
    await eventRepository.updateStatus(eventId, "processed");
    
    logger.info("Routing completed", { 
      eventId, 
      destinationCount: activeDestinations.length 
    });
  },
  {
    connection: getClient() as any,
    concurrency: 10,
  }
);

routeWorker.on("completed", (job) => {
  logger.info("Route completed", {
    jobId: job.id,
  });
});

routeWorker.on("failed", (job, err) => {
  logger.error("Route failed", {
    jobId: job?.id,
    error: err.message,
  });
});
