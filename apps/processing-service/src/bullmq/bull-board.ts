import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { createLogger } from "@fluxpipe/logger";
import { transformQueue, enrichQueue, routeQueue } from "./queues";

const logger = createLogger("processing-service");

let initialized = false;

export function initBullBoard(): ExpressAdapter {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  const queueAdapters = [
    new BullMQAdapter(transformQueue),
    new BullMQAdapter(enrichQueue),
    new BullMQAdapter(routeQueue),
  ];

  try {
    createBullBoard({
      queues: queueAdapters as any,
      serverAdapter,
    });

    initialized = true;
    logger.info("Bull Board initialized successfully", {
      queueCount: queueAdapters.length,
      queues: ["transform", "enrich", "route"],
      path: "/admin/queues",
    });
  } catch (err) {
    initialized = false;
    logger.error("Failed to initialize Bull Board", { error: String(err) });
  }

  return serverAdapter;
}

export function isBullBoardInitialized(): boolean {
  return initialized;
}
