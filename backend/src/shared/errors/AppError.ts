export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  UPSTREAM_GATEWAY_TIMEOUT = 'UPSTREAM_GATEWAY_TIMEOUT',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  KYC_PROCESSING = 'KYC_PROCESSING',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode | string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode | string = ErrorCode.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}
