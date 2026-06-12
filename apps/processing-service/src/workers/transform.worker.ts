import { Worker, Job } from "bullmq";
import { getClient } from "@fluxpipe/redis";
import { pipelineRepository, eventRepository } from "@fluxpipe/database";
import { createLogger } from "@fluxpipe/logger";
import { enrichQueue } from "../bullmq/queues";

const logger = createLogger("processing-service");
const redisClient = getClient() as any;

interface TransformJobData {
  eventId: string;
  orgId: string;
  pipelineId: string;
  payload: Record<string, unknown>;
  traceId?: string;
}

interface TransformRule {
  action: "rename" | "drop" | "coerce";
  from?: string;
  to?: string;
  field?: string;
  type?: "string" | "number" | "boolean" | "date";
}

export const transformWorker = new Worker<TransformJobData>(
  "transform",
  async (job: Job<TransformJobData>) => {
    const { eventId, pipelineId, payload, orgId } = job.data;

    logger.info("Transform worker started", { eventId, pipelineId });

    const pipeline = await pipelineRepository.findById(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    const rules = ((pipeline.config as any)?.transformRules ?? []) as TransformRule[];
    const transformedPayload: Record<string, unknown> = { ...payload };

    for (const rule of rules) {
      if (rule.action === "rename" && rule.from && rule.to) {
        transformedPayload[rule.to] = transformedPayload[rule.from];
        delete transformedPayload[rule.from];
        continue;
      }

      if (rule.action === "drop" && rule.field) {
        delete transformedPayload[rule.field];
        continue;
      }

      if (rule.action === "coerce" && rule.field && rule.type) {
        const value = transformedPayload[rule.field];
        switch (rule.type) {
          case "number":
            transformedPayload[rule.field] = Number(value);
            break;
          case "string":
            transformedPayload[rule.field] = String(value);
            break;
          case "boolean":
            transformedPayload[rule.field] = Boolean(value);
            break;
          case "date":
            transformedPayload[rule.field] = new Date(String(value)).toISOString();
            break;
        }
      }
    }

    await eventRepository.updateStatus(eventId, "processing");

    logger.info("Event marked processing", { eventId });

    await enrichQueue.add(
      "enrich-event",
      {
        eventId,
        orgId,
        pipelineId,
        transformedPayload,
      },
      {
        attempts: 2,
        backoff: { type: "fixed", delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      }
    );

    logger.info("Enrich job queued", { eventId });
  },
  {
    connection: redisClient,
    concurrency: 10,
  }
);

transformWorker.on("completed", (job: Job) => {
  logger.info("Transform job completed", { jobId: job.id });
});

transformWorker.on("failed", (job: Job<TransformJobData> | undefined, error: Error) => {
  logger.error("Transform job failed", { jobId: job?.id, error: error.message });
});
