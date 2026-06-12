import express, { Express } from "express";

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

export default app;
