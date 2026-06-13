import { Worker, Job } from "bullmq";
import axios from "axios";
import { getClient } from "@fluxpipe/redis";
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
  },
  {
    connection: getClient() as any,
    concurrency: 20,
  }
);

deliveryWorker.on("completed", (job: Job) => {
  logger.info("Delivery job completed", { jobId: job.id });
});

deliveryWorker.on("failed", (job: Job<DeliveryJobData> | undefined, error: Error) => {
  logger.error("Delivery failed", { jobId: job?.id, error: error.message });
});
