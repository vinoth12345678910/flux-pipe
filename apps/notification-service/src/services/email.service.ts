import nodemailer from "nodemailer";
import { createLogger } from "@fluxpipe/logger";

const logger = createLogger("notification-service");

interface FailureAlert {
  to: string;
  pipelineName: string;
  eventId: string;
  failureReason: string;
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    logger.warn("SMTP not configured, email service unavailable");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export const emailService = {
  async sendFailureAlert({ to, pipelineName, eventId, failureReason }: FailureAlert): Promise<void> {
    const transporter = createTransporter();
    if (!transporter) {
      logger.warn("Email not sent: SMTP not configured");
      return;
    }

    const html = `
      <h2>Event Delivery Failure</h2>
      <p><strong>Pipeline:</strong> ${pipelineName}</p>
      <p><strong>Event ID:</strong> ${eventId}</p>
      <p><strong>Failure Reason:</strong> ${failureReason}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@fluxpipe.io",
      to,
      subject: `[FluxPipe] Delivery Failure - ${pipelineName}`,
      html,
    });

    logger.info("Failure alert email sent", { eventId, pipelineName, to });
  },
};
