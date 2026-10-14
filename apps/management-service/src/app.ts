import express from "express";
import helmet from "helmet";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import pipelineRoutes from "./routes/pipeline.routes";
import destinationRoutes from "./routes/destination.routes";
import apikeyRoutes from "./routes/apikey.routes";
import eventRoutes from "./routes/event.routes";
import { usageController } from "./controllers/usage.controller";
import { authenticateJWT } from "./middlewares/auth.middleware";
import { requirePermission } from "./middlewares/rbac.middleware";
import { Permission } from "@fluxpipe/auth";
import { errorHandler } from "./middlewares/error.middleware";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "512kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "management-service", timestamp: new Date().toISOString() });
});

app.use("/v1/auth", authRoutes);
app.use("/v1/pipelines", pipelineRoutes);
app.use("/v1/destinations", destinationRoutes);
app.use("/v1/api-keys", apikeyRoutes);
app.use("/v1/events", eventRoutes);
app.get("/v1/usage", authenticateJWT, requirePermission(Permission.ViewUsage), usageController.getUsage);

app.use(errorHandler);

export default app;
