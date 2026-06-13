import { Queue } from "bullmq";
import { getClient } from "@fluxpipe/redis";

export const enrichmentQueue = new Queue("enrichment", {
  connection: getClient() as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});
