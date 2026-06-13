import { Worker, Job } from "bullmq";
import { getClient } from "@fluxpipe/redis";
import { createLogger } from "@fluxpipe/logger";
import { emailService } from "../services/email.service";
import { slackService } from "../services/slack.service";

const logger = createLogger("notification-service");

interface NotificationJobData {
  type: "email" | "slack";
  to: string;
  pipelineName: string;
  eventId: string;
  failureReason: string;
  webhookUrl?: string;
}

export const notificationWorker = new Worker<NotificationJobData>(
  "notifications",
  async (job: Job<NotificationJobData>) => {
    const { type, to, pipelineName, eventId, failureReason, webhookUrl } = job.data;

    logger.info("Processing notification", { type, eventId, pipelineName });

    if (type === "email") {
      await emailService.sendFailureAlert({ to, pipelineName, eventId, failureReason });
    } else if (type === "slack" && webhookUrl) {
      await slackService.sendFailureAlert({ webhookUrl, pipelineName, eventId, failureReason });
    }

    logger.info("Notification sent", { type, eventId });
  },
  {
    connection: getClient() as any,
    concurrency: 5,
  },
);

notificationWorker.on("completed", (job) => {
  logger.info("Notification job completed", { jobId: job.id });
});

notificationWorker.on("failed", (job, err) => {
  logger.error("Notification job failed", {
    jobId: job?.id,
    error: err.message,
  });
});
