import express, { Express } from "express";

const app: Express = express();

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "enrichment-service", timestamp: new Date().toISOString() });
});

export default app;
