export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class HttpError extends AppError {
  constructor(
    statusCode: number,
    code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(statusCode, code, message);
    this.name = "HttpError";
  }
}
