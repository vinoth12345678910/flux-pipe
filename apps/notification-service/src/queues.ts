import { Queue } from "bullmq";
import { getClient } from "@fluxpipe/redis";

export const notificationQueue = new Queue("notifications", {
  connection: getClient() as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 50,
    removeOnFail: 200,
  },
});
