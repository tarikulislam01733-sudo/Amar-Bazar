import { AppError, ErrorCode } from './AppError';

export class RateLimitError extends AppError {
  constructor(message: string = 'Too Many Requests') {
    super(message, 429, ErrorCode.RATE_LIMIT_EXCEEDED);
  }
}
