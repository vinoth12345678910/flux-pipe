import { createLogger } from "@fluxpipe/logger";
import { parseEnv } from "@fluxpipe/shared-config";
import { disconnectClient } from "@fluxpipe/database";
import app from "./app";
import "./workers/enrichment.worker";

const logger = createLogger("enrichment-service");

async function main(): Promise<void> {
  parseEnv();

  const port = parseInt(process.env.PORT || "3005", 10);
  const server = app.listen(port, () => {
    logger.info(`Enrichment service listening on port ${port}`);
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
  logger.error("Failed to start enrichment service", err);
  process.exit(1);
});
