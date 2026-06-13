import express, { Express } from "express";
import { initBullBoard } from "./bullmq/bull-board";
import { requireAdmin } from "./middlewares/admin-auth.middleware";

const app: Express = express();

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "processing-service", timestamp: new Date().toISOString() });
});

app.get("/metrics", (_req, res) => {
  res.json({
    service: "processing-service",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

const bullBoardAdapter = initBullBoard();
if (bullBoardAdapter) {
  app.use("/admin/queues", requireAdmin, bullBoardAdapter.getRouter());
}

export default app;
