import { Response } from "express";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta?: Record<string, unknown>;
}

export function success<T>(res: Response, data: T, statusCode = 200, meta?: Record<string, unknown>): void {
  const body: ApiResponse<T> = { success: true, data };
  if (meta) body.meta = meta;
  res.status(statusCode).json(body);
}

export function paginated<T>(
  res: Response,
  data: T[],
  meta: { page: number; limit: number; total: number; totalPages: number },
): void {
  res.status(200).json({ success: true, data, meta });
}

export function error(res: Response, statusCode: number, code: string, message: string, details?: unknown): void {
  const body: ApiResponse = { success: false, error: { code, message } };
  if (details !== undefined) body.error!.details = details;
  res.status(statusCode).json(body);
}
