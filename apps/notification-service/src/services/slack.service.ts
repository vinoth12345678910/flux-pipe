import { createLogger } from "@fluxpipe/logger";

const logger = createLogger("notification-service");

interface FailureAlert {
  webhookUrl: string;
  pipelineName: string;
  eventId: string;
  failureReason: string;
}

export const slackService = {
  async sendFailureAlert({ webhookUrl, pipelineName, eventId, failureReason }: FailureAlert): Promise<void> {
    try {
      const blocks = {
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "🚨 Event Delivery Failure" },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Pipeline:*\n${pipelineName}` },
              { type: "mrkdwn", text: `*Event ID:*\n${eventId}` },
              { type: "mrkdwn", text: `*Failure Reason:*\n${failureReason}` },
              { type: "mrkdwn", text: `*Time:*\n${new Date().toISOString()}` },
            ],
          },
        ],
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blocks),
      });

      if (!response.ok) {
        logger.error("Slack webhook failed", { webhookUrl, status: response.status });
      }
    } catch (err) {
      logger.error("Slack notification failed", { webhookUrl, error: String(err) });
    }
  },
};
