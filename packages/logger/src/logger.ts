import winston from "winston";
import { getTraceId } from "./trace";

const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const traceId = getTraceId() || meta.traceId || "-";
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${traceId}] ${level} [${service || "app"}]: ${message}${metaStr}`;
  }),
);

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
);

export function createLogger(service: string): winston.Logger {
  const isDev = process.env.NODE_ENV !== "production";

  return winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    defaultMeta: { service },
    format: isDev ? devFormat : prodFormat,
    transports: [new winston.transports.Console()],
  });
}
