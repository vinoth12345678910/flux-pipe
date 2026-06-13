import { createLogger } from "@fluxpipe/logger";
import { parseEnv } from "@fluxpipe/shared-config";
import { disconnectClient } from "@fluxpipe/database";
import { isBullBoardInitialized } from "./bullmq/bull-board";
import { startWorkers, stopWorkers } from "./services/processing.service";
import { startConsumer, stopConsumer } from "./consumers/event.consumer";
import app from "./app";

const logger = createLogger("processing-service");

async function main(): Promise<void> {
  parseEnv();

  // Start RabbitMQ consumer
  await startConsumer();
  logger.info("RabbitMQ consumer started");

  // Start BullMQ workers
  await startWorkers();
  logger.info("BullMQ workers started");

  const port = parseInt(process.env.PORT || "3003", 10);
  const server = app.listen(port, () => {
    logger.info(`Processing service listening on port ${port}`);
    if (isBullBoardInitialized()) {
      logger.info("Bull Board dashboard available at http://localhost:" + port + "/admin/queues");
    }
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    server.close(async () => {
      await stopConsumer();
      await stopWorkers();
      await disconnectClient();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error("Failed to start processing service", err);
  process.exit(1);
});
