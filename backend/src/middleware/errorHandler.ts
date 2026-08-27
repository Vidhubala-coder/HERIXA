import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

export interface CustomError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // 1. Mongoose Bad ObjectId CastError
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid format for field '${err.path}': '${err.value}'. Must be a valid 24-character hexadecimal ObjectId.`;
  }

  // 2. Mongoose ValidationError
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    const messages = Object.values(err.errors).map((val) => val.message);
    message = `Validation Error: ${messages.join(', ')}`;
  }

  // 3. Mongo Duplicate Key Error (e.g., unique email or slug)
  if ((err as any).code === 11000) {
    statusCode = 409;
    const field = Object.keys((err as any).keyValue || {})[0];
    message = `Conflict: A record with that ${field || 'value'} already exists.`;
  }

  const isDevelopment = process.env.NODE_ENV === 'development';

  console.error(`[Error] ${statusCode} - ${message}`);
  if (isDevelopment && statusCode === 500) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
};
