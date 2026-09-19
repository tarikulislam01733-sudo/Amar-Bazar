import { AppError, ErrorCode } from './AppError';

export class QuotaExceededError extends AppError {
  constructor(message: string = 'Monthly free ad limit reached. Purchase an additional ad slot.') {
    super(message, 403, ErrorCode.QUOTA_EXCEEDED);
  }
}
