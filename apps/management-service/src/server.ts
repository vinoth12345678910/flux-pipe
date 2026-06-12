import { createLogger } from "@fluxpipe/logger";
import { parseEnv } from "@fluxpipe/shared-config";
import { disconnectClient } from "@fluxpipe/database";
import { initJwtFromEnv } from "./utils/jwt";
import app from "./app";

const logger = createLogger("management-service");

async function main(): Promise<void> {
  parseEnv();
  initJwtFromEnv();

  const port = parseInt(process.env.PORT || "3001", 10);
  const server = app.listen(port, () => {
    logger.info(`Management service listening on port ${port}`);
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
  logger.error("Failed to start management service", err);
  process.exit(1);
});
