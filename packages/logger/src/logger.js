"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
const winston_1 = __importDefault(require("winston"));
const trace_1 = require("./trace");
const devFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.default.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const traceId = (0, trace_1.getTraceId)() || meta.traceId || "-";
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${traceId}] ${level} [${service || "app"}]: ${message}${metaStr}`;
}));
const prodFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json());
function createLogger(service) {
    const isDev = process.env.NODE_ENV !== "production";
    return winston_1.default.createLogger({
        level: process.env.LOG_LEVEL || "info",
        defaultMeta: { service },
        format: isDev ? devFormat : prodFormat,
        transports: [new winston_1.default.transports.Console()],
    });
}
//# sourceMappingURL=logger.js.map