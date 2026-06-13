import { consumeDLQ } from "@fluxpipe/rabbitmq";
import { createLogger } from "@fluxpipe/logger";
import { emailService } from "../services/email.service";
import { slackService } from "../services/slack.service";

const logger = createLogger("notification-service");

interface DLQMessage {
  eventId: string;
  orgId: string;
  pipelineId: string;
  failedDestinations?: string[];
  error?: string;
}

export class DLQConsumer {
  async start(): Promise<void> {
    await consumeDLQ(
      async (message: Record<string, unknown>, ack: () => void) => {
        const msg = message as unknown as DLQMessage;

        logger.warn("DLQ message received", {
          eventId: msg.eventId,
          orgId: msg.orgId,
          pipelineId: msg.pipelineId,
        });

        try {
          await emailService.sendFailureAlert({
            to: process.env.ALERT_EMAIL || "admin@fluxpipe.io",
            pipelineName: msg.pipelineId,
            eventId: msg.eventId,
            failureReason: msg.error || "No error details available",
          });

          const webhookUrl = process.env.SLACK_WEBHOOK_URL;
          if (webhookUrl) {
            await slackService.sendFailureAlert({
              webhookUrl,
              pipelineName: msg.pipelineId,
              eventId: msg.eventId,
              failureReason: msg.error || "No error details available",
            });
          }

          logger.info("DLQ message processed", { eventId: msg.eventId });
          ack();
        } catch (err) {
          logger.error("DLQ consumer error", {
            eventId: msg.eventId,
            error: err instanceof Error ? err.message : String(err),
          });
          ack();
        }
      },
    );

    logger.info("DLQ consumer started");
  }
}

export const dlqConsumer = new DLQConsumer();
