import { createLogger } from "@fluxpipe/logger";
import { parseEnv } from "@fluxpipe/shared-config";
import app from "./app";
import { dlqConsumer } from "./consumers/dlq.consumer";
import "./workers/notification.worker";

const logger = createLogger("notification-service");

async function main(): Promise<void> {
  parseEnv();

  await dlqConsumer.start();

  const port = parseInt(process.env.PORT || "3006", 10);
  const server = app.listen(port, () => {
    logger.info(`Notification service listening on port ${port}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error("Failed to start notification service", err);
  process.exit(1);
});
