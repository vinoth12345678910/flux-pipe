import { Worker, Job } from "bullmq";
import { getWorkerConnection } from "@fluxpipe/redis";
import { publishEvent } from "@fluxpipe/rabbitmq";
import { createLogger } from "@fluxpipe/logger";
import { profileService } from "../services/profile.service";
import { enrichmentQueue } from "../queues";

const logger = createLogger("enrichment-service");

interface EnrichmentJobData {
  eventId: string;
  orgId: string;
  pipelineId: string;
  externalId: string;
  payload: Record<string, unknown>;
}

export const enrichmentWorker = new Worker<EnrichmentJobData>(
  "enrichment",
  async (job: Job<EnrichmentJobData>) => {
    const { eventId, orgId, pipelineId, externalId, payload } = job.data;

    logger.info("Enrichment started", { eventId, orgId });

    const profile = await profileService.enrichProfile(orgId, externalId);

    const enrichedPayload = {
      ...payload,
      _profile: profile,
      enrichedAt: new Date().toISOString(),
    };

    await publishEvent("events.processed", `enrichment.${orgId}`, {
      eventId,
      orgId,
      pipelineId,
      payload: enrichedPayload,
    });

    logger.info("Enriched event published", { eventId });
  },
  {
    connection: getWorkerConnection() as any,
    concurrency: 10,
  },
);

enrichmentWorker.on("completed", (job) => {
  logger.info("Enrichment job completed", { jobId: job.id });
});

enrichmentWorker.on("failed", (job, err) => {
  logger.error("Enrichment job failed", {
    jobId: job?.id,
    error: err.message,
  });
});
