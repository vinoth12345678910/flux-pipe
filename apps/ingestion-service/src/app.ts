import express from "express";
import ingestRoutes from "./routes/ingest.routes";
import { errorHandler } from "./middlewares/error.middleware";

const app = express();

app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ingestion-service", timestamp: new Date().toISOString() });
});

app.use("/v1/ingest", ingestRoutes);

app.use(errorHandler);

export default app;
