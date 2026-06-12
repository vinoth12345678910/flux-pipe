import { createLogger } from "@fluxpipe/logger";
import { parseEnv } from "@fluxpipe/shared-config";
import { disconnectClient } from "@fluxpipe/database";
import { initJwt } from "@fluxpipe/auth";
import app from "./app";

const logger = createLogger("delivery-service");

async function main(): Promise<void> {
  const env = parseEnv();

  initJwt({
    secret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
  });

  const port = parseInt(process.env.PORT || "3004", 10);
  const server = app.listen(port, () => {
    logger.info(`Delivery service listening on port ${port}`);
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
  logger.error("Failed to start delivery service", err);
  process.exit(1);
});
