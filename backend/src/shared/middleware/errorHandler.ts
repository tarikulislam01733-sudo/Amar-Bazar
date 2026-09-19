import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { AppError, ErrorCode } from '../errors/AppError';
import { logger } from '../../config/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let code: string = ErrorCode.INTERNAL_SERVER_ERROR;
  let message = 'Internal Server Error';
  let details: any = {};

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    if (err.details) details = err.details;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    code = ErrorCode.VALIDATION_ERROR;
    message = 'Validation Error';
    const errors: Record<string, string> = {};
    for (const field in err.errors) {
      errors[field] = err.errors[field].message;
    }
    details = errors;
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = ErrorCode.VALIDATION_ERROR;
    message = `Invalid format for ${err.path}`;
  } else if (err instanceof jwt.TokenExpiredError) {
    statusCode = 401;
    code = ErrorCode.UNAUTHORIZED;
    message = 'Token expired';
  } else if (err instanceof jwt.JsonWebTokenError) {
    statusCode = 401;
    code = ErrorCode.UNAUTHORIZED;
    message = 'Invalid token';
  } else {
    // Unknown error
    message = err.message || 'Internal Server Error';
  }

  // Log 5xx errors
  if (statusCode >= 500) {
    logger.error(`[${req.method} ${req.url}] ${err.stack || err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details: Object.keys(details).length > 0 ? details : undefined,
    },
  });
};
