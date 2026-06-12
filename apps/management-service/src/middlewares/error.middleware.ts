import { Request, Response, NextFunction } from "express";
import { AppError } from "@fluxpipe/shared-utils";
import { ZodError } from "zod";
import { createLogger, getTraceId } from "@fluxpipe/logger";

const logger = createLogger("management-service");

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const traceId = getTraceId() || "-";

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: err.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
      },
    });
    return;
  }

  if ((err as any).code === "P2002") {
    res.status(409).json({
      success: false,
      error: { code: "CONFLICT", message: "Resource already exists" },
    });
    return;
  }

  logger.error({ traceId, message: err.message, stack: err.stack });

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: process.env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message,
    },
  });
}
