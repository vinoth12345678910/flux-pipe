import { createLogger } from "@fluxpipe/logger";
import { parseEnv } from "@fluxpipe/shared-config";
import { disconnectClient } from "@fluxpipe/database";
import app from "./app";

const logger = createLogger("processing-service");

async function main(): Promise<void> {
  parseEnv();

  const port = parseInt(process.env.PORT || "3003", 10);
  const server = app.listen(port, () => {
    logger.info(`Processing service listening on port ${port}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    server.close(async () => {
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
