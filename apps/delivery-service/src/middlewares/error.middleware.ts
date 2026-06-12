import { Request, Response, NextFunction } from "express";
import { AppError } from "@fluxpipe/shared-utils";
import { createLogger } from "@fluxpipe/logger";

const logger = createLogger("delivery-service");

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: { code: err.code, message: err.message } });
    return;
  }

  logger.error({ message: err.message, stack: err.stack });

  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
  });
}
