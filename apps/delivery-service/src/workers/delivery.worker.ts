import { Worker, Job } from "bullmq";
import axios from "axios";
import { getWorkerConnection } from "@fluxpipe/redis";
import { destinationRepository, deliveryRepository } from "@fluxpipe/database";
import { createLogger } from "@fluxpipe/logger";

const logger = createLogger("delivery-service");

interface DeliveryJobData {
  eventId: string;
  orgId: string;
  destinationId: string;
  payload: Record<string, unknown>;
  attemptNumber?: number;
}

import { publishEvent } from "@fluxpipe/rabbitmq";
import { getClient } from "@fluxpipe/database";

export const deliveryWorker = new Worker<DeliveryJobData>(
  "deliver",
  async (job: Job<DeliveryJobData>) => {
    const { eventId, destinationId, payload } = job.data;
    const startTime = Date.now();

    logger.info("Delivery started", { eventId, destinationId });

    const destination = await destinationRepository.findById(destinationId);
    if (!destination) {
      throw new Error(`Destination not found: ${destinationId}`);
    }

    const config = destination.config as Record<string, unknown>;
    try {
      const response = await axios.post(config.url as string, payload, {
        timeout: 30000,
        headers: {
          "Content-Type": "application/json",
          "X-FluxPipe-EventId": eventId,
        },
      });

      const latencyMs = Date.now() - startTime;

      await deliveryRepository.create({
        event: { connect: { id: eventId } },
        destination: { connect: { id: destinationId } },
        attemptNumber: (job.attemptsMade ?? 0) + 1,
        status: "success",
        responseCode: response.status,
        latencyMs,
      });

      logger.info("Delivery successful", { eventId, destinationId, latencyMs });
      return { success: true };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const responseCode = err.response?.status || 500;

      await deliveryRepository.create({
        event: { connect: { id: eventId } },
        destination: { connect: { id: destinationId } },
        attemptNumber: (job.attemptsMade ?? 0) + 1,
        status: "failed",
        responseCode,
        latencyMs,
      });

      const maxAttempts = job.opts.attempts || 1;
      const currentAttempt = (job.attemptsMade ?? 0) + 1;
      if (currentAttempt >= maxAttempts) {
        await getClient().event.update({
          where: { id: eventId },
          data: { status: "partial_failure" }, // or failed
        });

        const pipeline = await getClient().pipeline.findFirst({
          where: { destinations: { some: { id: destinationId } } }
        });
        if (pipeline) {
          await publishEvent("events.failed", "dlq", {
            eventId,
            orgId: pipeline.orgId,
            pipelineId: pipeline.id,
            failedDestinations: [destinationId],
            error: err.message,
          });
        }
      }

      throw err;
    }
  },
  {
    connection: getWorkerConnection() as any,
    concurrency: 20,
  }
);

deliveryWorker.on("completed", (job: Job) => {
  logger.info("Delivery job completed", { jobId: job.id });
});

deliveryWorker.on("failed", (job: Job<DeliveryJobData> | undefined, error: Error) => {
  logger.error("Delivery failed", { jobId: job?.id, error: error.message });
});
