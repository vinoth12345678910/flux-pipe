import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, the browser talks only to Vite (same origin) and Vite forwards to the
// right backend service, so no CORS setup is needed on any service.
const target = (port: number) => ({ target: `http://localhost:${port}`, changeOrigin: true });

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/v1/ingest": target(Number(process.env.INGESTION_PORT ?? 3002)),
      "/v1/deliveries": target(Number(process.env.DELIVERY_PORT ?? 3004)),
      "/v1": target(Number(process.env.MANAGEMENT_PORT ?? 3001)),
      "/health": target(Number(process.env.MANAGEMENT_PORT ?? 3001)),
    },
  },
});
