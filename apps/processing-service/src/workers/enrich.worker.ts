import { Worker, Job } from "bullmq";
import { getClient, cacheGet, cacheSet } from "@fluxpipe/redis";
import {
  eventRepository,
  orgRepository,
} from "@fluxpipe/database";
import { createLogger } from "@fluxpipe/logger";
import { routeQueue } from "../bullmq/queues";

const logger = createLogger("processing-service");

interface EnrichJobData {
  eventId: string;
  orgId: string;
  pipelineId: string;
  transformedPayload: Record<string, unknown>;
}

export const enrichWorker = new Worker(
  "enrich",

  async (job: Job<EnrichJobData>) => {
    const {
      eventId,
      orgId,
      pipelineId,
      transformedPayload,
    } = job.data;

    logger.info("Enrichment started", {
      eventId,
    });

    
    const cacheKey = `org:${orgId}:profile`;

  

    let orgProfile = await cacheGet<any>(cacheKey);

    if (!orgProfile) {
      logger.info("Cache miss", {
        orgId,
      });

      orgProfile = await orgRepository.findById(orgId);
      
      if (orgProfile) {
        await cacheSet(cacheKey, orgProfile, 300);
      }
    }

    if (!orgProfile) {
      throw new Error(
        `Organization not found: ${orgId}`
      );
    }

   
    const enrichedPayload = {
      ...transformedPayload,

      _meta: {
        orgId,
        orgName: orgProfile.name,
        plan: orgProfile.plan,
        enrichedAt:
          new Date().toISOString(),
      },
    };

    logger.info(
      "Payload enriched successfully",
      {
        eventId,
      }
    );

   

    await routeQueue.add(
      "route-event",
      {
        eventId,
        orgId,
        pipelineId,
        enrichedPayload,
      },
      {
        attempts: 2,

        backoff: {
          type: "fixed",
          delay: 2000,
        },

        removeOnComplete: 100,
        removeOnFail: 500,
      }
    );

    logger.info("Route job queued", {
      eventId,
    });
  },

  {
    connection: getClient() as any,
    concurrency: 10,
  }
);

enrichWorker.on("completed", (job) => {
  logger.info("Enrich completed", {
    jobId: job.id,
  });
});

enrichWorker.on("failed", (job, err) => {
  logger.error("Enrich failed", {
    jobId: job?.id,
    error: err.message,
  });
});