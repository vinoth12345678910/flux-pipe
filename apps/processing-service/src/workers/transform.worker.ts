import { Worker, Job } from "bullmq";
import { redisConnection } from "@fluxpipe/redis";
import { pipelineRepository } from "@fluxpipe/database";
import { eventRepository } from "@fluxpipe/database";
import { logger } from "@fluxpipe/logger";
import { enrichQueue } from "../bullmq/queues";

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
  type?: "string" | "number" | "boolean";
}

export const transformWorker = new Worker(
  "transform",

  async (job: Job<TransformJobData>) => {
    const { eventId, pipelineId, payload, orgId } = job.data;

    logger.info("Transform worker started", {
      eventId,
      pipelineId,
    });

    /*
      ====================================================
      STEP 1: LOAD PIPELINE CONFIG
      ====================================================

      Every pipeline can define transformation rules.

      Example:

      User Signup Pipeline

      rename userId -> user_id

      Order Pipeline

      rename totalAmount -> total_amount

      Different pipelines can have different rules.

      Therefore we fetch the config first.
    */

    const pipeline = await pipelineRepository.findById(pipelineId);

    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    /*
      Pipeline config is stored as JSON.

      Example:

      {
        transformRules: [...]
      }
    */

    const rules =
      ((pipeline.config as any)?.transformRules ??
        []) as TransformRule[];

    /*
      ====================================================
      STEP 2: CREATE WORKING COPY
      ====================================================

      Never mutate original payload.

      Imagine another worker is using it.

      Copy first.
    */

    const transformedPayload = {
      ...payload,
    };

    /*
      ====================================================
      STEP 3: APPLY TRANSFORM RULES
      ====================================================

      This is basically a mini compiler.

      Read rule.
      Modify payload.
      Move to next rule.
    */

    for (const rule of rules) {
      /*
        ------------------------------------
        RENAME
        ------------------------------------

        userId -> user_id
      */

      if (
        rule.action === "rename" &&
        rule.from &&
        rule.to
      ) {
        transformedPayload[rule.to] =
          transformedPayload[rule.from];

        delete transformedPayload[rule.from];

        continue;
      }

      /*
        ------------------------------------
        DROP
        ------------------------------------

        Remove unwanted fields.
      */

      if (
        rule.action === "drop" &&
        rule.field
      ) {
        delete transformedPayload[rule.field];

        continue;
      }

      /*
        ------------------------------------
        COERCE
        ------------------------------------

        Convert types.

        "500" -> 500

        "true" -> true
      */

      if (
        rule.action === "coerce" &&
        rule.field &&
        rule.type
      ) {
        const value =
          transformedPayload[rule.field];

        switch (rule.type) {
          case "number":
            transformedPayload[rule.field] =
              Number(value);
            break;

          case "string":
            transformedPayload[rule.field] =
              String(value);
            break;

          case "boolean":
            transformedPayload[rule.field] =
              Boolean(value);
            break;
        }
      }
    }

    /*
      ====================================================
      STEP 4: UPDATE EVENT STATUS
      ====================================================

      Event lifecycle:

      pending
         ↓
      processing
         ↓
      routed
         ↓
      delivered

      This lets users track progress.
    */

    await eventRepository.updateStatus(
      eventId,
      "processing"
    );

    logger.info("Event marked processing", {
      eventId,
    });

    /*
      ====================================================
      STEP 5: CREATE ENRICH JOB
      ====================================================

      Transform is done.

      Next stage:

      Enrichment.

      Example:

      Add:
      - org name
      - plan
      - metadata
      - geo info

      Don't do it here.

      Keep workers focused.
    */

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

        backoff: {
          type: "fixed",
          delay: 2000,
        },

        removeOnComplete: 100,
        removeOnFail: 500,
      }
    );

    logger.info("Enrich job queued", {
      eventId,
    });

    /*
      If this function exits successfully:

      BullMQ marks job completed.

      If it throws:

      BullMQ retries automatically.
    */
  },

  {
    connection: redisConnection,

    /*
      Concurrency 10 means:

      Up to 10 transform jobs
      can run simultaneously.

      Useful for throughput.
    */

    concurrency: 10,
  }
);

/*
  ====================================================
  EVENTS
  ====================================================

  BullMQ emits lifecycle events.

  Very useful for monitoring.
*/

transformWorker.on("completed", (job) => {
  logger.info("Transform job completed", {
    jobId: job.id,
  });
});

transformWorker.on("failed", (job, error) => {
  logger.error("Transform job failed", {
    jobId: job?.id,
    error: error.message,
  });
});