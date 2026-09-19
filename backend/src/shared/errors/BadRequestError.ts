import { AppError, ErrorCode } from './AppError';

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', details?: any) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, true, details);
  }
}
