import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Centralized error handler middleware.
 * Catches all thrown errors and returns a standardized JSON response.
 */
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error(`[ERROR] ${err.message}`, err.stack);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'An unexpected internal server error occurred.' });
};

/**
 * Wraps async route handlers to automatically catch errors and forward to the error middleware.
 */
export const asyncHandler = (fn: (req: any, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
