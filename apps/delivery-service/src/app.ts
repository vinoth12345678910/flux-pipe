import express, { Express } from "express";
import deliveryRoutes from "./routes/delivery.routes";
import { errorHandler } from "./middlewares/error.middleware";

const app: Express = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "delivery-service", timestamp: new Date().toISOString() });
});

app.use("/v1/deliveries", deliveryRoutes);

app.use(errorHandler);

export default app;
